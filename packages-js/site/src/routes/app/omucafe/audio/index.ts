import { ARC4 } from '$lib/random';
import { Timer } from '$lib/timer';
import type { Asset } from '../core/asset';
import type { Game } from '../core/game';
import { generateUid, type ValidateResult } from '../core/helper';

export interface AudioClipSingle {
    type: 'single';
    asset: Asset;
    start: number;
    duration: number;
}

export interface AudioClipRandom {
    type: 'random';
    clips: AudioClip[];
}

export type AudioClip = AudioClipSingle | AudioClipRandom;

export function validateAudioClip(clip: AudioClip): ValidateResult<AudioClip> {
    if (clip.type === 'single') {
        if (typeof clip.asset !== 'object' || typeof clip.asset.type !== 'string') {
            return { type: 'invalid', message: 'assetはAsset型でなければなりません' };
        }
        if (typeof clip.start !== 'number') {
            return { type: 'invalid', message: 'startはnumberでなければなりません' };
        }
        if (typeof clip.duration !== 'number') {
            return { type: 'invalid', message: 'durationはnumberでなければなりません' };
        }
    } else if (clip.type === 'random') {
        if (!Array.isArray(clip.clips)) {
            return { type: 'invalid', message: 'clipsはAudioClipの配列でなければなりません' };
        }
        for (const c of clip.clips) {
            const result = validateAudioClip(c);
            if (result.type === 'invalid') {
                return { type: 'invalid', message: `clipsの要素が無効: ${result.message}` };
            }
        }
    } else {
        return { type: 'invalid', message: 'typeはsingleかrandomでなければなりません' };
    }
    return { type: 'valid', value: clip };
}

export interface AudioPlayback {
    id: string;
    clip: AudioClip;
    start: number;
}

interface ClipNode {
    dest: AudioNode;
}

class ClipNodeSingle implements ClipNode {
    private constructor(
        public readonly dest: AudioBufferSourceNode,
    ) {}

    public static async create(clip: AudioClipSingle, system: AudioSystem): Promise<ClipNode | undefined> {
        const dest = system.ctx.createBufferSource();
        const result = await (await system.getBuffer(clip.asset)).promise;
        if (result.type !== 'ready') {
            console.error(`Failed to load audio clip: ${result.type === 'error' ? result.error : 'unknown error'}`);
            return undefined;
        }
        dest.buffer = result.data;
        dest.start(0, clip.start, clip.duration);
        return new ClipNodeSingle(dest);
    }
}

class ClipNodeRandom implements ClipNode {
    private constructor(
        public readonly dest: AudioNode,
    ) {}

    public static async create(clip: AudioClipRandom, system: AudioSystem, playback: AudioPlayback): Promise<ClipNode | undefined> {
        if (clip.clips.length === 0) {
            console.warn('AudioClipRandomのclipsが空です');
            return undefined;
        }
        const rng = ARC4.fromNumber(playback.start);
        const selectedClip = rng.choice(clip.clips);
        const node = await createClipNode(selectedClip, system, playback);
        if (!node) return;
        return new ClipNodeRandom(node.dest);
    }
}

async function createClipNode(clip: AudioClip, system: AudioSystem, playback: AudioPlayback): Promise<ClipNode | undefined> {
    if (clip.type === 'single') {
        const node = await ClipNodeSingle.create(clip, system);
        return node;
    } else if (clip.type === 'random') {
        const node = await ClipNodeRandom.create(clip, system, playback);
        return node;
    } else {
        console.error('Invalid AudioClip type:', clip);
        return undefined;
    }
}

class PlaybackInstance {
    private constructor() { }

    public static async create(system: AudioSystem, playback: AudioPlayback, dest: AudioNode): Promise<PlaybackInstance | undefined> {
        const node = await createClipNode(playback.clip, system, playback);
        if (!node) {
            return undefined;
        }
        node.dest.connect(dest);
        const instance = new PlaybackInstance();
        return instance;
    }
}

export class AudioSystem {
    public ctx: AudioContext;
    public sfx: GainNode;
    public master: GainNode;
    private instances: Map<string, PlaybackInstance> = new Map();

    constructor(
        private readonly game: Game,
    ) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.sfx = this.ctx.createGain();
        this.sfx.connect(this.master);
        this.updateVolumes();
    }

    private updateVolumes() {
        const { audio } = this.game.states.config.value;
        this.master.gain.value = audio.masterVolume;
        this.sfx.gain.value = audio.sfxVolume;
    }

    public async getBuffer(asset: Asset) {
        return this.game.asset.getAudioBuffer(asset);
    }

    public start(clip: AudioClip) {
        this.update({
            id: generateUid(),
            clip,
            start: Timer.now(),
        });
    }

    private async update(playback: AudioPlayback) {
        const existing = this.instances.get(playback.id);
        if (existing) {
            return;
        }
        const instance = await PlaybackInstance.create(this, playback, this.sfx);
        if (instance) {
            this.instances.set(playback.id, instance);
        }
        this.updateVolumes();
    }
}
