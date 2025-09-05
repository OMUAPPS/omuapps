import { getContext } from '../game/game.js';
import { uniqueId } from '../game/helper.js';
import { ARC4 } from '../game/random.js';
import { Time } from '../game/time.js';
import { getGame } from '../omucafe-app.js';
import { getAssetArrayBuffer, type Asset } from './asset.js';

export type Filter = {
    type: 'filter',
    clip: AudioClip,
    volume?: number,
    pan?: {
        type: 'item',
        id?: string,
    } | {
        type: 'const',
        value: number,
    },
    lowpass?: number,
    highpass?: number,
    attack?: number,
    release?: number,
};

export function createFilter(options: Omit<Filter, 'type'>): Filter {
    return {
        type: 'filter',
        ...options,
    };
}

export type Clip = {
    readonly type: 'clip',
    asset?: Asset,
    start: number,
    duration?: number,
    playbackRate?: number,
    loop: boolean,
};

export async function createClip(options: {
    asset?: Asset,
    start?: number,
    duration?: number,
    playbackRate?: number,
    loop?: boolean,
}): Promise<Clip> {
    const { asset, start, playbackRate, loop } = options;
    let { duration } = options;
    if (!duration && asset) {
        const buffer = await getAudioBuffer(asset);
        duration = buffer.length / buffer.sampleRate * 1000;
    }
    return {
        type: 'clip',
        asset,
        start: start ?? 0,
        duration: duration,
        playbackRate,
        loop: loop ?? false,
    };
}

export async function createClipFromAudio(asset: Asset): Promise<Clip> {
    const buffer = await getAudioBuffer(asset);
    return {
        type: 'clip',
        asset,
        start: 0,
        duration: buffer.length / buffer.sampleRate * 1000,
        playbackRate: 1.0,
        loop: false,
    };
}

export type EnvelopeClip = {
    readonly type: 'envelope',
    sources: {
        attack?: AudioClip,
        sustain?: AudioClip,
        release?: AudioClip,
    },
    durations: {
        attack?: number,
    },
    velocities: {
        attack?: number,
        sustain?: number,
        release?: number,
    },
};

export function createEnvelopeClip(options: {
    sources?: {
        attack?: Clip,
        decay?: Clip,
        sustain?: Clip,
        release?: Clip,
    },
}): EnvelopeClip {
    const { sources } = options;
    return {
        type: 'envelope',
        sources: sources ?? {},
        durations: {},
        velocities: {},
    };
}

export type RandomClip = {
    // Randomly select a clip from the list of clips
    // playingClip = Math.floor(random(seed + time) * clips.length) % clips.length
    readonly type: 'random',
    clips: Clip[],
    seed: number,
};

export function createRandomClip(options: {
    clips: Clip[],
    seed?: number,
}): RandomClip {
    const { clips, seed } = options;
    return {
        type: 'random',
        clips,
        seed: seed ?? 0,
    };
}

export type AudioClip = Clip | EnvelopeClip | RandomClip | Filter;

export type PlayingSource = {
    type: 'item',
    item: string,
} | {
    type: 'effect',
    item: string,
    effect: string,
};

export type PlayingAudioClip = {
    readonly id: string,
    clip: AudioClip,
    source?: PlayingSource,
    readonly startTime: number,
    stopTime?: number,
};

function getAudioKeyBySource(source: PlayingSource): string {
    switch (source.type) {
        case 'item': {
            return source.item;
        }
        case 'effect': {
            return `${source.item}/${source.effect}`;
        }
    }
}

function sourceExists(source: PlayingSource): boolean {
    const ctx = getContext();
    switch (source.type) {
        case 'item': {
            return !!ctx.items[source.item];
        }
        case 'effect': {
            const item = ctx.items[source.item];
            return item && !!item.behaviors.effect?.effects[source.effect];
        }
    }
}

export async function playAudioClip(clip: AudioClip, source?: PlayingSource): Promise<PlayingAudioClip> {
    const ctx = getContext();
    const time = Time.now();
    const id = source ? getAudioKeyBySource(source) : uniqueId();
    if (ctx.audios[id]) {
        ctx.audios[id].clip = clip;
        return ctx.audios[id];
    }
    const audio: PlayingAudioClip = {
        id,
        clip,
        startTime: time,
        source,
    };
    ctx.audios[id] = audio;
    return audio;
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

class ClipContext {
    constructor(
        public clip: AudioClip,
        public time: number,
        public readonly startTime: number,
        public stopTime?: number,
        public source?: PlayingSource,
    ) { }

    public static fromPlaying(playing: PlayingAudioClip) {
        const time = Time.now();
        return new ClipContext(
            playing.clip,
            time,
            playing.startTime,
            playing.stopTime,
            playing.source,
        );
    }

    public static fromClip(clip: AudioClip, source?: PlayingSource) {
        const time = Time.now();
        return new ClipContext(
            clip,
            time,
            time,
            undefined,
            source,
        );
    }

    get elapsed() {
        return this.time - this.startTime;
    }

    public offset(offset: number) {
        return new ClipContext(
            this.clip,
            this.time,
            this.startTime + offset,
            this.stopTime,
            this.source,
        );
    }
};

const audioInstances: Map<string, AudioInstance> = new Map();

interface AudioInstance<T = unknown> {
    update(clip: T, ctx: ClipContext): AudioNode | undefined;
    dispose(): void;
}

class AudioInstanceFilter implements AudioInstance<Filter> {
    constructor(
        private clip: AudioInstance,
        private attack?: GainNode,
        private release?: GainNode,
        private lowpass?: BiquadFilterNode,
        private highpass?: BiquadFilterNode,
        private panner?: StereoPannerNode,
    ) {}

    public static async from(filter: Filter, ctx: ClipContext) {
        return new AudioInstanceFilter(
            await createAudioInstance(filter.clip, ctx),
            audioCtx.createBiquadFilter(),
        );
    }

    public update(filter: Filter, ctx: ClipContext): AudioNode | undefined {
        const { lowpass, highpass, pan, attack, release } = filter;
        const nodes: AudioNode[] = [];
        let changed = false;
        if (attack !== undefined) {
            if (!this.attack) {
                changed = true;
                this.attack = audioCtx.createGain();
                this.attack.gain.value = 1;
            }
            nodes.push(this.attack);
            const remaining = ctx.startTime - ctx.time;
            const targetTime = Math.max(0, audioCtx.currentTime + remaining / 1000);
            this.attack.gain.setTargetAtTime(1, targetTime, attack / 3000);
        }
        if (release !== undefined && ctx.stopTime) {
            if (!this.release) {
                changed = true;
                this.release = audioCtx.createGain();
                this.release.gain.value = 1;
            }
            nodes.push(this.release);
            const remaining = ctx.stopTime - ctx.time;
            const targetTime = Math.max(0, audioCtx.currentTime + remaining / 1000);
            this.release.gain.setTargetAtTime(0, targetTime, release / 3000);
        }
        if (lowpass) {
            nodes.push(this.lowpass ??= (changed = true, audioCtx.createBiquadFilter()));
            this.lowpass.frequency.value = lowpass;
        }
        if (highpass) {
            nodes.push(this.highpass ??= (changed = true, audioCtx.createBiquadFilter()));
            this.highpass.frequency.value = highpass;
        }
        if (pan) {
            nodes.push(this.panner ??= (changed = true, audioCtx.createStereoPanner()));
            switch (pan.type) {
                case 'item': {
                    const { items } = getContext();
                    if (ctx.source && (ctx.source.type === 'item' || ctx.source.type === 'effect')) {
                        const item = pan.id ? items[pan.id] : items[ctx.source.item];
                        if (item) {
                            this.panner.pan.value = item.transform.offset.x;
                        }
                    }
                    break;
                }
                case 'const': {
                    this.panner.pan.value = pan.value;
                    break;
                }
            }
        }
        const sourceNode = this.clip.update(filter.clip, ctx);
        if (!sourceNode) return;
        if (changed) {
            sourceNode.disconnect();
            nodes.map(node => node.disconnect());
        }
        return nodes.reduce((source, node) => {
            return source.connect(node);
        }, sourceNode);
    }

    public dispose() {
        this.highpass?.disconnect();
        this.lowpass?.disconnect();
        this.panner?.disconnect();
    }
}

class AudioInstanceClip implements AudioInstance<Clip> {
    constructor(
        public source: AudioBufferSourceNode,
        public playing: boolean,
    ) {}

    public static async from(clip: Clip) {
        const source = audioCtx.createBufferSource();
        if (clip.asset) {
            const buffer = await getAudioBuffer(clip.asset);
            source.buffer = buffer;
        }
        return new AudioInstanceClip(
            source,
            false,
        );
    }

    public dispose() {
        this.source.disconnect();
        this.source.stop();
    }

    public update(clip: Clip, ctx: ClipContext): AudioNode {
        if (!this.playing) {
            this.playing = true;
            this.source.start(Math.max(0, audioCtx.currentTime - ctx.elapsed / 1000), (ctx.elapsed + clip.start) / 1000);
        }
        this.source.loop = clip.loop;
        this.source.loopStart = clip.start;
        if (this.source.buffer) {
            const { buffer } = this.source;
            this.source.loopEnd = clip.start + (clip.duration ? clip.duration / 1000 : buffer.length / buffer.sampleRate);
        }
        if (clip.playbackRate) {
            this.source.playbackRate.value = clip.playbackRate;
        }
        return this.source;
    }
}

class AudioInstanceRandom implements AudioInstance<RandomClip> {
    constructor(
        public source?: AudioInstance,
    ) {}

    public static async from(random: RandomClip, ctx: ClipContext) {
        if (random.clips.length === 0) {
            return new AudioInstanceRandom();
        }
        const rng = ARC4.fromNumber(ctx.startTime + random.seed);
        const clip = rng.choice(random.clips);
        const instance = await createAudioInstance(clip, ctx);
        return new AudioInstanceRandom(
            instance,
        );
    }

    public dispose() {
        this.source?.dispose();
    }

    public update(random: RandomClip, ctx: ClipContext): AudioNode | undefined {
        if (random.clips.length === 0) return;
        const rng = ARC4.fromNumber(ctx.startTime + random.seed);
        const clip = rng.choice(random.clips);
        return this.source?.update(clip, ctx);
    }
}

class AudioInstanceEnvelope implements AudioInstance<EnvelopeClip> {
    constructor(
        public sources: Record<keyof EnvelopeClip['sources'], AudioInstance | undefined>,
        public dest: GainNode,
    ) {}

    public static async from(clip: EnvelopeClip, ctx: ClipContext) {
        const { attack, sustain, release } = clip.sources;
        return new AudioInstanceEnvelope(
            {
                attack: attack && await createAudioInstance(attack, ctx),
                sustain: sustain && await createAudioInstance(sustain, ctx),
                release: release && await createAudioInstance(release, ctx),
            },
            audioCtx.createGain(),
        );
    }

    public dispose() {
        Object.values(this.sources).map((source) => {
            if (!source) return;
            source.dispose();
        });
        this.dest.disconnect();
    }

    public update(clip: EnvelopeClip, ctx: ClipContext): AudioNode | undefined {
        const { attack, sustain, release } = this.sources;
        if (attack && clip.sources.attack) {
            attack.update(clip.sources.attack, ctx)?.connect(this.dest);
        }
        if (sustain && clip.sources.sustain) {
            sustain.update(clip.sources.sustain, ctx)?.connect(this.dest);
        }
        if (release && clip.sources.release) {
            release.update(clip.sources.release, ctx)?.connect(this.dest);
        }
        return this.dest;
    }
}

const MAX_AUDIO_DURATION = 1000 * 60 * 5; // 5 minutes

function getClipAudioDest(ctx: ClipContext): AudioNode {
    if (!ctx.source) return masterNode;
    return effectsNode;
}

function updateAudioConfig() {
    const { configRegistry } = getGame();
    masterNode.gain.value = configRegistry.value.audio.volumes.master;
    effectsNode.gain.value = configRegistry.value.audio.volumes.effects;
}

export async function updateAudioClips(): Promise<void> {
    const time = Time.now();
    const context = getContext();
    if (context.side !== 'client') return;
    updateAudioConfig();
    const { audios } = context;
    for (const id in audios) {
        const playing = audios[id];
        const elapsed = time - playing.startTime;
        if (elapsed > MAX_AUDIO_DURATION) {
            delete audios[id];
            continue;
        }
        if (!playing.stopTime && playing.source && !sourceExists(playing.source)) {
            playing.stopTime = time;
        }
        const ctx = ClipContext.fromPlaying(playing);
        const existing = audioInstances.get(id);
        const endTime = await estimateClipEndTime(playing.clip, ctx);
        if (endTime && endTime <= time) {
            if (existing) {
                existing.dispose();
                audioInstances.delete(id);
            }
            delete audios[id];
        }
        const dest = getClipAudioDest(ctx);
        if (existing) {
            existing.update(playing.clip, ctx)?.connect(dest);
            continue;
        } else {
            const instance = await createAudioInstance(playing.clip, ctx);
            instance.update(playing.clip, ctx)?.connect(dest);
            audioInstances.set(id, instance);
        }
    }
}

async function createAudioInstance(clip: AudioClip, ctx: ClipContext): Promise<AudioInstance> {
    switch (clip.type) {
        case 'clip': {
            return await AudioInstanceClip.from(clip);
        }
        case 'envelope': {
            return await AudioInstanceEnvelope.from(clip, ctx);
        }
        case 'filter': {
            return await AudioInstanceFilter.from(clip, ctx);
        }
        case 'random': {
            return await AudioInstanceRandom.from(clip, ctx);
        }
    }
}

async function estimateClipEndTime(clip: AudioClip, ctx: ClipContext): Promise<number | undefined> {
    if (clip.type === 'clip') {
        if (!clip.asset) return 0;
        if (clip.loop) {
            if (!ctx.stopTime) return;
            return ctx.stopTime;
        }
        const buffer = await getAudioBuffer(clip.asset);
        const duration = clip.duration ?? buffer.length / buffer.sampleRate * 1000 * (clip.playbackRate ?? 1.0);
        return ctx.startTime + duration;
    }
    if (clip.type === 'envelope') {
        if (!ctx.stopTime) return;
        let offset = 0;
        if (clip.durations.attack) offset += clip.durations.attack;
        const endtimes: number[] = [];
        const attack = clip.sources.attack && await estimateClipEndTime(clip.sources.attack, ctx);
        if (attack) endtimes.push(attack);
        const sustain = clip.sources.sustain && await estimateClipEndTime(clip.sources.sustain, ctx.offset(offset));
        if (sustain) endtimes.push(sustain);
        const release = clip.sources.release && await estimateClipEndTime(clip.sources.release, ctx.offset(offset));
        if (release) endtimes.push(release);
        return Math.max(...endtimes);
    }
    if (clip.type === 'filter') {
        let endTime = await estimateClipEndTime(clip.clip, ctx);
        if (!endTime) return;
        if (clip.release) {
            endTime += clip.release;
        }
        return endTime;
    }
    if (clip.type === 'random') {
        if (clip.clips.length === 0) return;
        const random = ARC4.fromNumber(ctx.startTime + clip.seed);
        const randomClip = random.choice(clip.clips);
        return estimateClipEndTime(randomClip, ctx);
    }
    return;
}

let audioCtx: AudioContext;
let masterNode: GainNode;
let effectsNode: GainNode;

export function createAudioContext() {
    audioCtx = new AudioContext();
    masterNode = audioCtx.createGain();
    masterNode.connect(audioCtx.destination);
    effectsNode = audioCtx.createGain();
    effectsNode.connect(masterNode);
}
