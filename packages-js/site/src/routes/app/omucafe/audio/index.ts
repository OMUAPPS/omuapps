import { Timer } from '$lib/timer';
import type { Asset } from '../core/asset';
import type { Game } from '../core/game';
import { generateUid } from '../core/helper';

export interface AudioClip {
    asset: Asset;
    start: number;
    duration: number;
}

export interface AudioPlayback {
    id: string;
    clip: AudioClip;
    start: number;
}

class PlaybackInstance {
    private constructor(
        playback: AudioPlayback,
    ) { }

    public static async create(system: AudioSystem, playback: AudioPlayback): Promise<PlaybackInstance | undefined> {
        // 3. Create a source node and connect it to speakers
        const source = system.ctx.createBufferSource();
        const result = await (await system.getBuffer(playback.clip)).promise;
        if (result.type === 'ready') {
            source.buffer = result.data;
            source.connect(system.ctx.destination);
            source.start(0, playback.clip.start, playback.clip.duration);
            return new PlaybackInstance(playback);
        }
    }
}

export class AudioSystem {
    public ctx: AudioContext;
    private instances: Map<string, PlaybackInstance> = new Map();

    constructor(
        private readonly game: Game,
    ) {
        this.ctx = new AudioContext();
    }

    public async getBuffer(clip: AudioClip) {
        return this.game.asset.getAudioBuffer(clip.asset);
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
        const instance = await PlaybackInstance.create(this, playback);
        if (instance) {
            this.instances.set(playback.id, instance);
        }
    }
}
