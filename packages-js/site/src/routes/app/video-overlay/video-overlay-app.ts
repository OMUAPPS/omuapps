import type { Omu } from '@omujs/omu';
import type { Writable } from 'svelte/store';
import { DiscordRPCAPI } from '../discord-overlay/plugin/plugin';

export type VideoOverlayConfig = {
    user?: string;
    password?: string;
    channels: Record<string, {
        password: string;
    } | undefined>;
};

export class VideoOverlayApp {
    public readonly discord: DiscordRPCAPI;
    public readonly config: Writable<VideoOverlayConfig>;

    constructor(
        private readonly omu: Omu,
    ) {
        this.discord = new DiscordRPCAPI(omu);
        this.config = omu.registries.json<VideoOverlayConfig>('config', { default: {
            channels: {},
        } }).compatSvelte();
    }
}
