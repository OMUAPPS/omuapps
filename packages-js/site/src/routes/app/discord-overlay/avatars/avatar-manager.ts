import type { GlContext } from '$lib/components/canvas/glcontext';
import type { Vec2Like } from '$lib/math/vec2';
import type { AvatarConfig, Config, DiscordOverlayApp, UserConfig } from '../discord-overlay-app';
import type { User, VoiceStateItem } from '../discord/type';
import type { Avatar, AvatarContext } from './avatar';
import { PNGAvatar } from './pngavatar';
import { PNGTuber, type PNGTuberData } from './pngtuber';

type AvatarCacheKey<T extends string = string, K extends string = string> = `${T}:${K}`;

type LoadingState<T> = {
    type: 'unloaded';
} | {
    type: 'loading';
} | {
    type: 'loaded';
    data: T;
} | {
    type: 'failed';
    reason: {
        type: 'not_found';
        id: string;
    };
} | {
    type: 'no_avatar';
};

export type AvatarState = LoadingState<{
    context: AvatarContext;
    prevPos: Vec2Like;
    cacheKey: string;
    getConfig(): AvatarConfig | undefined;
}>;

export type ModelState = LoadingState<{
    cacheKey: string;
    avatar: Avatar;
    getConfig(): AvatarConfig | undefined;
}>;

export class AvatarManager {
    private readonly avatars: Record<string, AvatarState> = {};
    private readonly models: Record<string, ModelState> = {};

    constructor(
        private readonly context: GlContext,
        private readonly overlayApp: DiscordOverlayApp,
        private readonly getConfig: () => Config,
    ) {}

    private async createDefaultAvatar(url: string) {
        const base = await this.overlayApp.getSource({ type: 'url', url });
        const model = await PNGAvatar.load(this.context, {
            base,
        });
        return model;
    }

    private getAvatarCacheKeyByVoiceState(userConfig: UserConfig, user: User): AvatarCacheKey {
        if (!userConfig.avatar) {
            return user.avatar ? `discord:${user.id}/${user.avatar}` : 'discord:default';
        }
        const avatar = this.getConfig().avatars[userConfig.avatar];
        return avatar ? `avatar:${userConfig.avatar}-${avatar.type}-${avatar.key}` : 'avatar:not_found';
    }

    private async loadAvatarModelByConfig(avatar: AvatarConfig): Promise<Avatar> {
        let parsedData: PNGTuberData;
        if (avatar.type === 'pngtuber') {
            const buffer = await this.overlayApp.getSource(avatar.source);
            parsedData = JSON.parse(new TextDecoder().decode(buffer));
            const model = await PNGTuber.load(this.context, parsedData);
            return model;
        } else if (avatar.type === 'png') {
            const base = await this.overlayApp.getSource(avatar.base);
            const active = avatar.active && await this.overlayApp.getSource(avatar.active);
            const deafened = avatar.deafened && await this.overlayApp.getSource(avatar.deafened);
            const muted = avatar.muted && await this.overlayApp.getSource(avatar.muted);
            const model = await PNGAvatar.load(this.context, {
                base,
                active,
                deafened,
                muted,
            });
            return model;
        } else {
            throw new Error(`Unknown avatar type ${JSON.stringify(avatar)}`);
        }
    }

    public loadAvatarModelById(id: string): ModelState {
        const avatar = this.getConfig().avatars[id];
        if (!avatar) return {
            type: 'failed',
            reason: { type: 'not_found', id },
        };

        const cacheKey = `avatar:${id}-${avatar.type}-${avatar.key}`;
        let state = this.models[id] ?? { type: 'unloaded' };

        if (state.type === 'loaded' && state.data.cacheKey !== cacheKey) {
            state = { type: 'unloaded' };
        }
        if (state.type === 'unloaded') {
            state = {
                type: 'loading',
            };
            this.loadAvatarModelByConfig(avatar).then((model) => {
                this.models[id] = {
                    type: 'loaded',
                    data: {
                        cacheKey,
                        avatar: model,
                        getConfig: () => this.getConfig().avatars[id],
                    },
                };
            });
        }
        this.models[id] = state;
        return state;
    }

    public loadAvatarByVoiceState(id: string, voiceState: VoiceStateItem): AvatarState {
        const userConfig = this.getConfig().users[id];
        if (!userConfig) {
            return { type: 'failed', reason: { type: 'not_found', id } };
        }

        const cacheKey = this.getAvatarCacheKeyByVoiceState(userConfig, voiceState.user);
        let state: AvatarState = this.avatars[id] ?? { type: 'unloaded' };

        if (state.type === 'loaded') {
            if (state.data.cacheKey === cacheKey) return state;
            state = { type: 'unloaded' };
        }

        if (state.type !== 'unloaded') return state;

        if (userConfig.avatar) {
            const model = this.loadAvatarModelById(userConfig.avatar);
            if (model.type === 'loaded') {
                return this.avatars[id] = {
                    type: 'loaded',
                    data: {
                        context: model.data.avatar.create(),
                        cacheKey: model.data.cacheKey,
                        prevPos: userConfig.position,
                        getConfig: model.data.getConfig,
                    },
                };
            }
            return state;
        }

        const { user } = voiceState;
        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        this.createDefaultAvatar(avatarUrl).then((avatar) => {
            this.avatars[id] = {
                type: 'loaded',
                data: {
                    context: avatar.create(),
                    prevPos: userConfig.position,
                    cacheKey: this.getAvatarCacheKeyByVoiceState(userConfig, voiceState.user),
                    getConfig: () => undefined,
                },
            };
        });

        return this.avatars[id] = { type: 'loading' };
    }
}
