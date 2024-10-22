<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { PoseStack } from '$lib/math/pose-stack.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { PNGTuber, type Effect, type PNGTuberData } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { Identifier } from '@omujs/omu';
    import { DiscordOverlayApp, type Config, type VoiceStateUser } from '../discord-overlay-app.js';
    import { createBackLightEffect } from '../effects/backlight.js';
    import { createBloomEffect } from '../effects/bloom.js';
    import { createShadowEffect } from '../effects/shadow.js';
    import robo from '../robo.json';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from '../shaders.js';

    export let overlayApp: DiscordOverlayApp;
    export let message: {type: 'loading'| 'failed', text: string} | null = null;
    export let showGrid = false;
    const { voiceState, speakingState, config } = overlayApp;

    let defaultAvatar: PNGTuber;
    let gridProgram: GlProgram;
    $: zoom = 2 ** $config.zoom_level;
    const timer = new Timer();
    let shadowEffect: Effect;
    let backlightEffect: Effect;
    let bloomEffect: Effect;

    async function init(context: GlContext) {
        defaultAvatar = await PNGTuber.load(context, robo);
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
        const entries = Object.entries($voiceState);
        for (const [, state] of entries) {
            await getAvatar(context, state.user);
        }
        shadowEffect = await createShadowEffect(context);
        backlightEffect = await createBackLightEffect(context);
        bloomEffect = await createBloomEffect(context);
    }

    async function render(context: GlContext) {
        const entries = Object.entries($voiceState);

        const { gl } = context;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const poseStack = new PoseStack();
        poseStack.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1)
        poseStack.translate(gl.canvas.width / 2, gl.canvas.height / 2, 0);
        poseStack.scale(zoom, zoom, 1);
        poseStack.translate($config.camera_position[0], $config.camera_position[1], 0);

        if (showGrid) {
            const vertexBuffer = context.createBuffer();
            vertexBuffer.bind(() => {
                vertexBuffer.setData(new Float32Array([
                    -1, -1, 0,
                    1, -1, 0,
                    -1, 1, 0,
                    -1, 1, 0,
                    1, -1, 0,
                    1, 1, 0,
                ]), 'static');
            });
            const uvBuffer = context.createBuffer();
            uvBuffer.bind(() => {
                uvBuffer.setData(new Float32Array([
                    0, 0,
                    1, 0,
                    0, 1,
                    0, 1,
                    1, 0,
                    1, 1,
                ]), 'static');
            });
    
            gridProgram.use(() => {
                const transformUniform = gridProgram.getUniform('u_transform').asMat4();
                const matrix = poseStack.get().inverse();
                transformUniform.set(matrix);
                const gridColorUniform = gridProgram.getUniform('u_gridColor').asVec4();
                gridColorUniform.set(new Vec4(230 / 255, 230 / 255, 230 / 255, 1));
                const gridBackgroundUniform = gridProgram.getUniform('u_backgroundColor').asVec4();
                gridBackgroundUniform.set(new Vec4(0, 0, 0, 0));
                const positionAttribute = gridProgram.getAttribute('a_position');
                positionAttribute.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
                const uvAttribute = gridProgram.getAttribute('a_texcoord');
                uvAttribute.set(uvBuffer, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            })
        }

        const effects: Effect[] = [
            $config.effects.shadow && shadowEffect,
            $config.effects.backlightEffect && backlightEffect,
            $config.effects.bloom && bloomEffect,
        ].filter((it): it is Effect => !!it);
        
        const now = Date.now();
        const toRender = await Promise.all(entries.filter(([id,]) => $config.users[id].show).map(async ([id, state], i) => {
            const user = getUser(id);
            const avatar = await getAvatar(context, state.user);
            return { id, state, user, avatar };
        }));
        toRender
            .sort((a, b) => b.user.order - a.user.order)
            .map(({ id, state, user, avatar }, index) => {
                const speakState = $speakingState[id];
                const timestamp = speakState?.speaking_start;
                const talkingTime = timestamp ? now - timestamp : 0; 
                poseStack.push();
                poseStack.translate(user.position[0], user.position[1], 0);
                poseStack.translate(0, 162.1 * 0.75, 0);
                poseStack.scale(user.scale, user.scale, 1);
                poseStack.translate(0, -162.1 * 0.75, 0);
                poseStack.scale(0.5, 0.5, 1);
                const time = timer.getElapsedMS() / 500 + index * 0.5;
                const blinking = state.voice_state.self_mute || Math.sin(time) > 0.995;
                avatar.render(poseStack, {
                    time: timer.getElapsedMS(),
                    blinking,
                    talking: speakState?.speaking,
                    talkingTime,
                    effects,
                });
                poseStack.pop();
            });
    }

    const avatarCache = new Map<string, {id: string, avatar: PNGTuber}>();

    async function getAvatar(gl: GlContext, user: VoiceStateUser): Promise<PNGTuber> {
        const userConfig = getUser(user.id);
        if (!userConfig.avatar) {
            return defaultAvatar;
        }
        const existing = avatarCache.get(user.id);
        if (existing && existing.id === userConfig.avatar) {
            return existing.avatar;
        }
        message = {
            type: 'loading',
            text: `${user.username}のアバターを読み込み中...`,
        }
        let parsedData: PNGTuberData;
        try {
            const buffer = await overlayApp.getAvatar(Identifier.fromKey(userConfig.avatar));
            parsedData = JSON.parse(new TextDecoder().decode(buffer));
            const pngtuber = await PNGTuber.load(gl, parsedData);
            avatarCache.set(user.id, { id: userConfig.avatar, avatar: pngtuber });
            message = null;
            return pngtuber;
        } catch (e) {
            console.error(e);
            message = {
                type: 'failed',
                text: `${user.username}のアバターの読み込みに失敗しました: ${e}`,
            }
            setTimeout(() => {
                message = null;
            }, 5000);
            return defaultAvatar;
        }
    }

    function invalidateAvatarCache(config: Config) {
        for (const [id, user] of Object.entries(config.users)) {
            if (!user.avatar) {
                avatarCache.delete(id);
            }
        }
    }

    $: {
        invalidateAvatarCache($config);
    }

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = {
                show: true,
                position: [0, 0],
                scale: 1,
                avatar: null,
                order: 0,
            };
            $config.users[id] = user;
        }
        return user;
    }

    $: Object.keys($voiceState).forEach(id => {
        getUser(id);
    });
</script>

<Canvas {init} {render}/>
