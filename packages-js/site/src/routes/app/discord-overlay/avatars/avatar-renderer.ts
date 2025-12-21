// import type { RenderPipeline } from '$lib/components/canvas/pipeline';
// import type { AABB2 } from '$lib/math/aabb2';
// import type { Mat4 } from '$lib/math/mat4';
// import type { Vec2 } from '$lib/math/vec2';
// import type { Config, UserConfig } from '../discord-overlay-app';
// import type { SpeakingState } from '../discord/discord';
// import type { VoiceStateItem } from '../discord/type';
// import { alignIndexes } from '../states';
// import type { AvatarContext } from './avatar';
// import type { AvatarManager } from './avatar-manager';
// import type { LayoutEngine } from './layout-engine';

// interface RenderedAvatar {
//     bounds: AABB2;
//     pos: Vec2;
//     worldToModel: Mat4;
//     context: AvatarContext;
// }

// const renderedAvatars = new Map<string, RenderedAvatar>();
// export class AvatarRenderer {
//     constructor(
//         private readonly config: Config,
//         private readonly pipeline: RenderPipeline,
//         private readonly avatarManager: AvatarManager,
//         private readonly layoutEngine: LayoutEngine,
//     ) {}

//     async drawSingleAvatar(
//         id: string,
//         userConfig: UserConfig,
//         voiceState: VoiceStateItem,
//         speakingState: SpeakingState,
//         alignTotal: number,
//         screenBounds: AABB2,
//         align: boolean | undefined,
//     ): Promise<RenderedAvatar | undefined> {
//         const avatar = this.avatarManager.loadAvatarByVoiceState(id, voiceState);
//         if (avatar.type !== 'loaded') return;
//         this.pipeline.matrices.model.push();

//         const { target, current } = this.layoutEngine.applyUserTransform(id, userConfig, this.config.align.alignSide, alignIndexes[id], alignTotal);
//         const worldPos = this.pipeline.matrices.getModelToWorld().transform2({ x: 0, y: POSITION_OFFSET });
//         this.pipeline.matrices.model.translate(0, -POSITION_OFFSET, 0);

//         const avatarConfig = avatar.data.getConfig();
//         const spacingFactor = layoutEngine.getFitScaleFactor();
//         applyAvatarScale(userConfig.scale / spacingFactor);
//         if (avatarConfig) {
//             applyAvatarTransform(avatarConfig);
//         }

//         const modelBounds = avatar.data.context.bounds();
//         const modelToWorld = this.pipeline.matrices.getModelToWorld();
//         const worldBounds = modelToWorld.transformAABB2(modelBounds).expand({ x: 40, y: 40 });
//         const alignedWorldBounds = worldBounds
//             .offset(Vec2.from(current).scale(-1))
//             .offset(target);

//         if (!screenBounds.intersects(worldBounds)) {
//             this.pipeline.matrices.model.pop();
//             return;
//         }
//         const renderOptions: RenderOptions = {
//             effects: effectManager.getActiveEffects(),
//             objects: $world.attahed[id]?.map((attached): RenderObject => {
//                 return {
//                     render: () => {
//                         const source = getSourceTexture(attached.object.source);
//                         if (source.type === 'failed') {
//                             delete $world.objects[id];
//                         }
//                         if (source.type !== 'loaded') return;
//                         const { texture } = source;
//                         this.pipeline.matrices.model.push();
//                         draw.circle(0, 0, 0, 20, PALETTE_RGB.DEBUG_RED);
//                         draw.circle(attached.origin.x, attached.origin.y, 0, 20, PALETTE_RGB.DEBUG_BLUE);
//                         this.pipeline.matrices.model.translate(attached.origin.x, attached.origin.y, 0);
//                         this.pipeline.matrices.model.scale(attached.object.scale, attached.object.scale, 1);
//                         this.pipeline.matrices.model.translate(-attached.offset.x, -attached.offset.y, 0);
//                         draw.texture(
//                             -texture.width / 2, -texture.height / 2,
//                             texture.width / 2, texture.height / 2,
//                             texture,
//                         );
//                         this.pipeline.matrices.model.pop();
//                     },
//                     attached,
//                 };
//             }) || [],
//         };
//         avatar.data.context.render({
//             id,
//             talking: speakState.speaking,
//             mute: voiceState.voice_state.mute,
//             deaf: voiceState.voice_state.deaf,
//             self_mute: voiceState.voice_state.self_mute,
//             self_deaf: voiceState.voice_state.self_deaf,
//             suppress: voiceState.voice_state.suppress,
//             config: userConfig.config,
//         }, renderOptions);

//         this.pipeline.matrices.model.pop();
//         if (align && userConfig.align && $dragState?.id === id) {
//             const { min, max } = alignedWorldBounds;
//             const center = alignedWorldBounds.center();
//             draw.roundedRect(min, max, 40, PALETTE_RGB.BACKGROUND_3, 1);
//             draw.roundedRect(min, max, 40, PALETTE_RGB.ACCENT, 5);
//             draw.fontSize = 24;
//             draw.fontWeight = '600';
//             await draw.textAlign(
//                 { x: center.x, y: max.y + 20 },
//                 'ここに整列',
//                 Vec2.ONE.scale(0.5),
//                 PALETTE_RGB.ACCENT,
//                 { color: PALETTE_RGB.BACKGROUND_3, width: 3 },
//             );
//         } else if ($dragState?.id === id) {
//             const { min, max } = worldBounds;
//             draw.roundedRect(min, max, 40, PALETTE_RGB.OUTLINE_1, 5);
//         }
//         return {
//             bounds: worldBounds,
//             worldToModel: modelToWorld,
//             context: avatar.data.context,
//             pos: worldPos,
//         };
//     }
// }
