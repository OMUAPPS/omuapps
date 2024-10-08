<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { PoseStack } from '$lib/math/pose-stack.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { PNGTuber } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import UserConfigEntry from './components/UserConfigEntry.svelte';
    import { DiscordOverlayApp, DISCORDRPC_PERMISSIONS } from './discord-overlay-app.js';
    import robo from './robo.json';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from './shaders.js';

    const omu = new Omu(APP);
    const { voiceState, speakingState, config } = new DiscordOverlayApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            ...Object.values(DISCORDRPC_PERMISSIONS)
        )
        omu.start();
    }

    let avatar: PNGTuber;
    let gridProgram: GlProgram;
    let cameraMatrix: Mat4 = Mat4.IDENTITY;
    const timer = new Timer();

    async function init(context: GlContext) {
        avatar = await PNGTuber.load(context, robo);
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
    }

    async function render(context: GlContext) {
        const { gl } = context;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const poseStack = new PoseStack();
        poseStack.identity();
        poseStack.translate(gl.canvas.width / 2, gl.canvas.height / 2, 0);

        poseStack.multiply(cameraMatrix);
            
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
        
        const entries = Object.entries($voiceState);
        const count = entries.length;
        const now = Date.now();
        entries.forEach(([id, state], index) => {
            const user = getUser(id);
            if (!user.show) return;
            const speakState = $speakingState[id];
            const timestamp = speakState?.speaking_start;
            const talkingTime = timestamp ? now - timestamp : 0; 
            poseStack.push();
            poseStack.translate(user.position[0], user.position[1], 0);
            poseStack.scale(0.5, 0.5, 1);
            avatar.render(poseStack, {
                time: timer.getElapsedMS(),
                blinking: state.voice_state.self_mute,
                talking: speakState?.speaking,
                talkingTime,
            });
            poseStack.pop();
        });
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
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <div class="controls">
            <div class="users">
                {#each Object.entries($voiceState) as [id, state] (id)}
                    {@const user = getUser(id)}
                    <UserConfigEntry {config} {id} {state}/>
                {/each}
            </div>
        </div>
        <div class="canvas">
            <Canvas {init} {render}/>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: row;
        margin: 1rem;
        gap: 0.5rem;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: var(--color-bg-2);
        width: 20rem;
    }

    .users {
        display: flex;
        flex-direction: column;
        padding: 1rem;
    }

    .canvas {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid #e6e6e6;
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
