<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { type GlContext } from '$lib/components/canvas/glcontext.js';
    import { Mat4 } from '$lib/math/mat4.js';
    import { PNGTuber } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { DiscordOverlayApp } from './discord-overlay-app.js';
    import robo from './robo.json';

    const omu = new Omu(APP);
    const { voiceState, speakingState } = new DiscordOverlayApp(omu);
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }

    let avatar: PNGTuber;
    const timer = new Timer();

    async function init(context: GlContext) {
        avatar = await PNGTuber.load(context, robo);
    }

    async function render(context: GlContext) {
        const { gl } = context;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        const entries = Object.entries($voiceState);
        const count = entries.length;
        const now = Date.now();
        entries.forEach(([id, state], index) => {
            const speakState = $speakingState[id];
            const timestamp = speakState?.speaking_start;
            const talkingTime = timestamp ? now - timestamp : 0; 
            avatar.render({
                time: timer.getElapsedMS(),
                blinking: state.voice_state.self_mute,
                talking: speakState?.speaking,
                talkingTime,
            }, Mat4.IDENTITY
                .translate((index - count / 2) * 200, 0, 0)
                .translate(gl.canvas.width / 2, gl.canvas.height - 100, 0)
                .scale(1 / 3));
        });
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <Canvas {init} {render}/>
        <div class="debug">
            <ul>
                {#each Object.entries($voiceState) as [id, state] (id)}
                    <li>
                        {$speakingState[id]?.speaking ? '🎤' : ''}
                        {state.nick}
                        {state.voice_state.self_mute ? '🔇' : ''}
                        {state.voice_state.self_deaf ? '🔊' : ''}
                    </li>
                {/each}
            </ul>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        padding: 2rem;
        color: var(--color-1);
        container-type: inline-size;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
    }

    .debug {
        position: fixed;
        bottom: 0;
        right: 0;
        padding: 1rem;
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
