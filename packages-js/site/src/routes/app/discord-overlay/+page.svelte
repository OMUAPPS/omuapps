<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { type GlContext } from '$lib/components/canvas/glcontext.js';
    import { PNGTuber } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { DiscordOverlayApp } from './discord-overlay-app.js';
    import robo from './robo.json';

    const omu = new Omu(APP);
    const { config } = new DiscordOverlayApp(omu);
    setClient(omu);


    if (BROWSER) {
        omu.start();
    }

    let avatar: PNGTuber;
    const timer = new Timer();
    let blinking = false;
    let talking = false;
    const talkingTimer = new Timer();

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
        
        avatar.render({
            time: timer.getElapsedMS(),
            blinking,
            talking,
            talkingTime: talkingTimer.getElapsedMS(),
        });
        console.log(talkingTimer.getElapsedMS());
    }

    function toggleTalking() {
        if (talking) {
            talking = false;
        } else {
            if (talkingTimer.getElapsedMS() > 500) {
                talkingTimer.reset();
            }
            talking = true;
        }
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <Canvas {init} {render}/>
        <button on:click={toggleTalking}>
            {talking ? 'Stop Talking' : 'Start Talking'}
        </button>
        <button on:click={() => (blinking = !blinking)}>
            {blinking ? 'Stop Blinking' : 'Start Blinking'}
        </button>
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

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
