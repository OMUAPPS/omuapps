import { getContext } from '../game/game.js'
import { uniqueId } from '../game/helper.js'
import { ARC4 } from '../game/random.js'
import { Time } from '../game/time.js'
import { getAssetArrayBuffer, type Asset } from './asset.js'

export type Filter = Partial<{
    volume: number,
    playbackRate: number,
    pan: {
        type: 'item',
        id: string,
    } | {
        type: 'const',
        value: number,
    },
    lowpass: number,
    highpass: number,
}>

export function createFilter(options: {
    volume?: number,
    playbackRate?: number,
}): Filter {
    const { volume, playbackRate } = options;
    return {
        volume: volume ?? 1,
        playbackRate: playbackRate ?? 1,
    }
}

export type Clip = {
    readonly type: 'clip',
    readonly id: string,
    asset: Asset,
    start: number,
    duration?: number,
    loop: boolean,
    filter: Filter,
}

export async function createClip(options: {
    asset: Asset,
    id?: string,
    start?: number,
    duration?: number,
    loop?: boolean,
    filter?: Filter,
}): Promise<Clip> {
    const { asset, id, start, loop, filter } = options
    let { duration } = options
    if (!duration) {
        const buffer = await getAudioBuffer(asset);
        duration = buffer.length / buffer.sampleRate * 1000;
    }
    return {
        type: 'clip',
        id: id ?? uniqueId(),
        asset,
        start: start ?? 0,
        duration: duration,
        loop: loop ?? false,
        filter: filter ?? createFilter({}),
    }
}

export type ADSRClip = {
    readonly type: 'adsr',
    readonly id: string,
    name: string,
    sources: {
        attack: Clip,
        decay: Clip,
        sustain: Clip,
        release: Clip,
    },
    filter: Filter,
}

export function createADSRClip(options: {
    id: string,
    name: string,
    sources: {
        attack: Clip,
        decay: Clip,
        sustain: Clip,
        release: Clip,
    },
    filter?: Filter,
}): ADSRClip {
    const { id, name, sources, filter } = options
    return {
        type: 'adsr',
        id,
        name,
        sources,
        filter: filter ?? createFilter({}),
    }
}

export type RandomClip = {
    // Randomly select a clip from the list of clips
    // playingClip = Math.floor(random(seed + time) * clips.length) % clips.length
    readonly type: 'random',
    readonly id: string,
    clips: Clip[],
    seed: number,
}

export function createRandomClip(options: {
    id: string,
    clips: Clip[],
    seed?: number,
}): RandomClip {
    const { id, clips, seed } = options
    return {
        type: 'random',
        id,
        clips,
        seed: seed ?? 0,
    }
}

export type AudioClip = Clip | ADSRClip | RandomClip

export type PlayingAudioClip = {
    readonly id: string,
    clip: AudioClip,
    startTime: number,
    stopTime?: number,
}

async function estimateClipTime(clip: AudioClip, time: number): Promise<number | undefined> {
    if (clip.type === 'clip') {
        const buffer = await getAudioBuffer(clip.asset);
        const estimatedTime = clip.duration ?? buffer.length / buffer.sampleRate * 1000;
        if (clip.filter.playbackRate) {
            return estimatedTime * clip.filter.playbackRate;
        }
        return estimatedTime;
    }
    if (clip.type === 'random') {
        if (clip.clips.length === 0) return undefined;
        const random = ARC4.fromNumber(time + clip.seed);
        const randomClip = random.choice(clip.clips);
        return estimateClipTime(randomClip, time);
    }
    return undefined;
}

export async function playAudioClip(
    clip: AudioClip,
): Promise<PlayingAudioClip> {
    const ctx = getContext();
    const time = Time.now();
    const duration = await estimateClipTime(clip, time);
    const audio: PlayingAudioClip = {
        id: uniqueId(),
        clip,
        startTime: time,
        stopTime: duration ? time + duration : undefined,
    }
    ctx.audios[audio.id] = audio
    return audio
}

export function stopAudioClip(
    audio: PlayingAudioClip,
): void {
    const ctx = getContext();
    audio.stopTime = Time.now();
    ctx.audios[audio.id] = audio;
}

const audioBuffers: Map<string, AudioBuffer> = new Map();

export async function getAudioBuffer(asset: Asset): Promise<AudioBuffer> {
    const key = asset.type === 'asset' ? asset.id : asset.url;
    const existing = audioBuffers.get(key);
    if (existing) return existing;
    const buffer = await getAssetArrayBuffer(asset);
    const audioBuffer = await audioCtx.decodeAudioData(buffer);
    audioBuffers.set(key, audioBuffer);
    return audioBuffer;
}

const audioInstances: Map<string, AudioInstanceClip> = new Map();
const MAX_AUDIO_DURATION = 60 * 1000 * 5; // 5 minutes

class AudioFilter {
    constructor(
        public options: Filter,
        public lowpass?: BiquadFilterNode,
        public highpass?: BiquadFilterNode,
        public panner?: StereoPannerNode,
    ) {}

    public static from(options: Filter) {
        return new AudioFilter(
            options,
            audioCtx.createBiquadFilter(),
        );
    }

    public update(options: Filter, source: AudioNode, target: AudioNode) {
        this.options = options;
        const { lowpass, highpass, pan, playbackRate, volume } = options;
        const nodes: AudioNode[] = [];
        if (lowpass) {
            nodes.push(this.lowpass ??= audioCtx.createBiquadFilter());
            this.lowpass.frequency.value = lowpass;
        }
        if (highpass) {
            nodes.push(this.highpass ??= audioCtx.createBiquadFilter());
            this.highpass.frequency.value = highpass;
        }
        if (pan) {
            nodes.push(this.panner ??= audioCtx.createStereoPanner());
            switch (pan.type) {
                case 'item': {
                    const { items } = getContext();
                    const item = items[pan.id];
                    this.panner.pan.value = item.transform.offset.x;
                    break;
                }
                case 'const': {
                    this.panner.pan.value = pan.value;
                    break
                }
            }
        }
        nodes.reduce((source, node) => {
            return source.connect(node);
        }, source).connect(target);
    }

    public dispose() {
        this.highpass?.disconnect();
        this.lowpass?.disconnect();
        this.panner?.disconnect();
    }
}

class AudioInstanceClip {
    constructor(
        public source: AudioBufferSourceNode,
        public filter: AudioFilter,
        public playing: boolean,
    ) {}

    public static async from(clip: Clip) {
        const buffer = await getAudioBuffer(clip.asset);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clip.filter.playbackRate ?? 1;
        const filter = AudioFilter.from(clip.filter);
        filter.update(clip.filter, source, audioCtx.destination);
        return new AudioInstanceClip(
            source,
            filter,
            false,
        )
    }

    public dispose() {
        this.source.disconnect();
        this.filter.dispose();
    }

    public update(clip: Clip, target: AudioNode, elapsed: number) {
        if (!this.playing) {
            this.playing = true;
            this.source.start(audioCtx.currentTime - elapsed / 1000, elapsed / 1000);
        }
        this.filter.update(clip.filter, this.source, target);
    }
}

export async function updateAudioClips(
    time: number,
): Promise<void> {
    const context = getContext()
    if (context.side !== 'client') return;
    const { audios } = context
    for (const id in audios) {
        const audio = audios[id]
        const elapsed = time - audio.startTime;
        if (elapsed > MAX_AUDIO_DURATION) {
            delete audios[id]
            continue;
        }
        const existing = audioInstances.get(id)
        if (existing) {
            if (audio.stopTime && audio.stopTime < time) {
                existing.dispose();
                audioBuffers.delete(id);
                delete audios[id]
            }
            continue;
        } else if (audio.stopTime && audio.stopTime < time) {
            delete audios[id]
            continue;
        }
        if (audio.clip.type !== 'clip') {
            throw new Error(`Unsupported audio clip type: ${audio.clip.type}`)
        }
        const instance = await AudioInstanceClip.from(audio.clip);
        instance.update(audio.clip, audioCtx.destination, elapsed);
        audioInstances.set(id, instance);
    }
}

let audioCtx: AudioContext;

export async function createAudioContext() {
    audioCtx = new AudioContext();
}
