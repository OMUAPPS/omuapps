<script lang="ts">
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { PoseStack } from '$lib/math/pose-stack.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { PNGTuber, type PNGTuberData } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { Identifier } from '@omujs/omu';
    import { DiscordOverlayApp, type Config, type VoiceStateUser } from '../discord-overlay-app.js';
    import robo from '../robo.json';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from '../shaders.js';

    export let overlayApp: DiscordOverlayApp;
    export let message: {type: 'loading'| 'failed', text: string} | null;
    const { voiceState, speakingState, config } = overlayApp;

    let defaultAvatar: PNGTuber;
    let gridProgram: GlProgram;
    $: zoom = 2 ** $config.zoom_level;
    const timer = new Timer();

    async function init(context: GlContext) {
        defaultAvatar = await PNGTuber.load(context, robo);
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
        const entries = Object.entries($voiceState);
        for (const [, state] of entries) {
            await getAvatar(context, state.user);
        }
    }

    async function render(context: GlContext) {
        const entries = Object.entries($voiceState);
        const avatars: PNGTuber[] = [];
        for (const [, state] of entries) {
            const avatar = await getAvatar(context, state.user);
            avatars.push(avatar);
        }

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
            const resolutionUniform = gridProgram.getUniform('u_resolution').asVec2();
            resolutionUniform.set(new Vec2(gl.canvas.width, gl.canvas.height));
            const projectionUniform = gridProgram.getUniform('u_projection').asMat4();
            projectionUniform.set(poseStack.get().inverse());
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
        
        const now = Date.now();
        entries.map(([id, state], index) => {
            const user = getUser(id);
            if (!user.show) return;
            const speakState = $speakingState[id];
            const timestamp = speakState?.speaking_start;
            const talkingTime = timestamp ? now - timestamp : 0; 
            poseStack.push();
            poseStack.translate(user.position[0], user.position[1], 0);
            poseStack.scale(0.5, 0.5, 1);
            const avatar = avatars[index];
            avatar.render(poseStack, {
                time: timer.getElapsedMS(),
                blinking: state.voice_state.self_mute,
                talking: speakState?.speaking,
                talkingTime,
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
        const buffer = await overlayApp.getAvatar(Identifier.fromKey(userConfig.avatar));
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
