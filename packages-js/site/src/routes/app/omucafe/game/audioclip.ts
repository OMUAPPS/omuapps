import { getAudioByAsset, type Asset } from './asset.js'
import { getContext } from './game.js'
import { Time } from './time.js'

export type Filter = Partial<{
    volume: number,
    pitch: number,
    pan: number,
    lowpass: number,
    highpass: number,
}>

export function createFilter(options: {
    volume?: number,
    pitch?: number,
    pan?: number,
    lowpass?: number,
    highpass?: number,
}): Filter {
    const { volume, pitch, pan, lowpass, highpass } = options
    return {
        volume: volume ?? 1,
        pitch: pitch ?? 1,
        pan: pan ?? 0,
        lowpass: lowpass ?? 0,
        highpass: highpass ?? 0,
    }
}

export type Clip = {
    readonly type: 'clip',
    readonly id: string,
    asset: Asset,
    start: number,
    loop: boolean,
    filter: Filter,
}

export function createClip(options: {
    id: string,
    asset: Asset,
    start?: number,
    loop?: boolean,
    filter?: Filter,
}): Clip {
    const { id, asset, start, loop, filter } = options
    return {
        type: 'clip',
        id,
        asset,
        start: start ?? 0,
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

let counter = 0;
export function playAudioClip(
    clip: AudioClip,
): PlayingAudioClip {
    const time = Time.get()
    const id = (Time.get() * 1000 + counter++).toString(16)
    const audio: PlayingAudioClip = {
        id,
        clip,
        startTime: time,
    }
    console.log('playAudioClip', audio)
    getContext().audios[id] = audio
    return audio
}

export function stopAudioClip(
    audio: PlayingAudioClip,
): void {
    audio.stopTime = Time.get()
    console.log('stopAudioClip', audio)
    getContext().audios[audio.id] = audio
}

const playingElements: Map<string, HTMLAudioElement> = new Map()
const MAX_AUDIO_DURATION = 60 * 1000 * 5; // 5 minutes

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
        const exist = playingElements.get(id)
        if (exist) {
            if (audio.stopTime) {
                exist.pause()
                exist.currentTime = 0
                playingElements.delete(id)
                delete audios[id]
            }
            continue;
        } else if (audio.stopTime) {
            delete audios[id]
            continue;
        }
        if (audio.clip.type !== 'clip') {
            throw new Error(`Unsupported audio clip type: ${audio.clip.type}`)
        }
        const element = playingElements.get(id) || await getAudioByAsset(audio.clip.asset);
        playingElements.set(id, element)
        element.currentTime = audio.clip.start + elapsed;
        element.play();
        element.loop = false;
    }
}
