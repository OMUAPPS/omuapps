import { comparator } from '$lib/helper';
import { AABB2 } from '$lib/math/aabb2';
import { Mat4 } from '$lib/math/mat4';
import { Vec2 } from '$lib/math/vec2';
import { Vec4 } from '$lib/math/vec4';
import { get } from 'svelte/store';
import { PALETTE_RGB } from '../consts';
import type { AvatarConfig, UserConfig } from '../discord-overlay-app';
import type { SpeakingState } from '../discord/discord';
import type { VoiceStateItem } from '../discord/type';
import { dragState } from '../states';
import type { AppRenderer } from './app-renderer';
import type { AvatarAction, AvatarContext, RenderObject, RenderOptions } from './avatar';
import { LayoutEngine } from './layout-engine';

interface RenderedAvatar {
    bounds: AABB2;
    pos: Vec2;
    worldToModel: Mat4;
    context: AvatarContext;
}

export class AvatarRenderer {
    public readonly renderedAvatars = new Map<string, RenderedAvatar>();
    constructor(
        private readonly app: AppRenderer,
    ) {}

    private applyAvatarScale(scale: number) {
        const { matrices } = this.app.pipeline;
        matrices.model.translate(0, LayoutEngine.AVATAR_FACE_RADIUS, 0);
        matrices.model.scale(scale, scale, 1);
        matrices.model.translate(0, -LayoutEngine.AVATAR_FACE_RADIUS, 0);
    }

    public applyAvatarTransform(config: AvatarConfig) {
        const { matrices } = this.app.pipeline;
        matrices.model.scale(config.scale, config.scale, 1);
        matrices.model.translate(config.offset[0], config.offset[1], 0);
        if (config.type === 'pngtuber') {
            matrices.model.scale(
                config.flipHorizontal ? -1 : 1,
                config.flipVertical ? -1 : 1,
                1,
            );
        }
    }

    async drawSingleAvatar(
        id: string,
        userConfig: UserConfig,
        voiceState: VoiceStateItem,
        speakState: SpeakingState,
        alignTotal: number,
        screenBounds: AABB2,
        align: boolean | undefined,
    ): Promise<RenderedAvatar | undefined> {
        const avatar = this.app.avatarManager.loadAvatarByVoiceState(id, voiceState);
        const { matrices, draw } = this.app.pipeline;
        if (avatar.type !== 'loaded') {
            const { user } = this.app.voiceState.states[id];
            const name = user.global_name ?? user.username;
            await draw.textAlign(
                userConfig.position,
                `${name}を読み込み中`,
                Vec2.ONE.scale(0.5),
                PALETTE_RGB.ACCENT,
            );
            return;
        }
        matrices.model.push();

        const { target, current } = this.app.layoutEngine.applyUserTransform(id, userConfig, this.app.config.align.alignSide, this.app.layoutEngine.getAlignIndexes()[id], alignTotal);
        const worldPos = matrices.getModelToWorld().transform2({ x: 0, y: LayoutEngine.POSITION_OFFSET });
        matrices.model.translate(0, -LayoutEngine.POSITION_OFFSET, 0);

        const avatarConfig = avatar.data.getConfig();
        const spacingFactor = this.app.layoutEngine.getFitScaleFactor();
        this.applyAvatarScale(userConfig.scale / spacingFactor);
        if (avatarConfig) {
            this.applyAvatarTransform(avatarConfig);
        }

        const modelBounds = avatar.data.context.bounds();
        const modelToWorld = matrices.getModelToWorld();
        const worldBounds = modelToWorld.transformAABB2(modelBounds).expand({ x: 40, y: 40 });
        const alignedWorldBounds = worldBounds
            .offset(Vec2.from(current).scale(-1))
            .offset(target);

        if (!screenBounds.intersects(worldBounds)) {
            matrices.model.pop();
            return;
        }
        const renderOptions: RenderOptions = {
            effects: this.app.effectManager.getActiveEffects(),
            objects: this.app.world.attahed[id]?.map((attached): RenderObject => this.app.objectManager.getRenderObject(id, attached)) || [],
        };

        avatar.data.context.render(this.buildAvatarAction(id, speakState, voiceState, userConfig), renderOptions);

        matrices.model.pop();
        if (align && userConfig.align && get(dragState)?.id === id) {
            const { min, max } = alignedWorldBounds;
            const center = alignedWorldBounds.center();
            draw.roundedRect(min, max, 40, PALETTE_RGB.BACKGROUND_3, 1);
            draw.roundedRect(min, max, 40, PALETTE_RGB.ACCENT, 5);
            draw.fontSize = 24;
            draw.fontWeight = '600';
            await draw.textAlign(
                { x: center.x, y: max.y + 20 },
                'ここに整列',
                Vec2.ONE.scale(0.5),
                PALETTE_RGB.ACCENT,
                { color: PALETTE_RGB.BACKGROUND_3, width: 3 },
            );
        } else if (get(dragState)?.id === id) {
            const { min, max } = worldBounds;
            draw.roundedRect(min, max, 40, PALETTE_RGB.OUTLINE_1, 5);
        }
        return {
            bounds: worldBounds,
            worldToModel: modelToWorld,
            context: avatar.data.context,
            pos: worldPos,
        };
    }

    private buildAvatarAction(id: string, speakState: SpeakingState, voiceState: VoiceStateItem, userConfig: UserConfig): AvatarAction {
        return {
            id,
            talking: speakState.speaking,
            mute: voiceState.voice_state.mute,
            deaf: voiceState.voice_state.deaf,
            self_mute: voiceState.voice_state.self_mute,
            self_deaf: voiceState.voice_state.self_deaf,
            suppress: voiceState.voice_state.suppress,
            config: userConfig.config,
        };
    }

    private getSortedVoiceEntries(): [string, VoiceStateItem][] {
        return Object.entries(this.app.voiceState.states)
            .filter((entry): entry is [string, VoiceStateItem] => !!entry[1])
            .filter(([id]) => this.app.config.users[id])
            .toSorted(comparator(([id]) => this.app.config.users[id].lastDraggedAt));
    }

    private getWorldSpaceScreenBounds() {
        const { gl } = this.app.pipeline.context;
        const { width, height } = gl.canvas;
        return this.app.pipeline.matrices.getViewToWorld().transformAABB2(new AABB2(Vec2.ZERO, new Vec2(width, height)));
    }

    async drawAvatars() {
        const entries = this.getSortedVoiceEntries();
        const alignTotal = this.app.layoutEngine.calculateAlignments(entries);
        const names: Array<{
            userConfig: UserConfig;
            pos: Vec2;
            name: string;
        }> = [];
        const screenBounds = this.getWorldSpaceScreenBounds();
        const align = this.app.config.align.alignSide && alignTotal > 0;
        this.renderedAvatars.clear();

        for (const [id, voiceState] of entries) {
            const userConfig = this.app.config.users[id];
            if (!voiceState) return;
            const speakState = this.app.speakingState.states[id] ?? {
                speaking: false,
                speaking_start: 0,
                speaking_stop: 0,
            };
            const screenPos = await this.app.avatarRenderer.drawSingleAvatar(id, userConfig, voiceState, speakState, alignTotal, screenBounds, align);
            if (!screenPos) continue;
            this.renderedAvatars.set(id, screenPos);
            if (this.app.config.show_name_tags) {
                const name = voiceState.nick ?? voiceState.user.global_name ?? voiceState.user.username;
                names.push({
                    userConfig,
                    pos: screenPos.pos,
                    name,
                });
            }
        }

        const offsetScale = this.app.overlayApp.isOnAsset() ? 4 : 2;
        const alignSide = this.app.config.align.alignSide;
        const horizontal = alignSide && alignSide.align.y === 0;
        const { draw } = this.app.pipeline;
        draw.fontSize = this.app.overlayApp.isOnAsset() ? 36 : 26;
        draw.fontWeight = '600';
        for (const entry of names) {
            const { pos, name, userConfig: user } = entry;
            const align = user.align ? alignSide?.align : undefined;
            await draw.textAlign(
                horizontal ? pos.add({ x: 0, y: align ? LayoutEngine.POSITION_OFFSET * 2 : 0 }) : pos,
                name,
                { x: align ? (align.x + 1) / 2 : 0.5, y: 1 },
                { x: 1, y: 1, z: 1, w: 1 },
                { width: offsetScale, color: new Vec4(0, 0, 0, 1) },
            );
        }
    }
}
