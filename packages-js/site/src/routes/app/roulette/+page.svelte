<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { RouletteApp } from './roulette-app.js';
    import Roulette from './components/Roulette.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';

    const omu = new Omu(APP);
    setClient(omu);
    const roulette = new RouletteApp(omu);
    const { entries, state } = roulette;

    function spin() {
        roulette.spin();
    }

    function test() {
        const entries = Array.from({ length: 1000 }, (_, i) => ({
            id: i.toString(),
            name: `Entry ${i + 1}`,
        }));
        roulette.setEntries(Object.fromEntries(entries.map((entry) => [entry.id, entry])));
    }

    if (BROWSER) {
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <div class="left">
            <button on:click={spin}>Spin</button>
            <button on:click={test}>Test</button>
            <p>entries</p>
            <button on:click={() => roulette.clearEntries()}> Clear </button>
            {#each Object.entries($entries) as [id, entry] (id)}
                <div class="entry">
                    {entry.name}
                    <button
                        on:click={() => {
                            roulette.removeEntry(id);
                        }}
                    >
                        Remove
                    </button>
                </div>
            {/each}
            <button
                on:click={() => {
                    const id = Date.now().toString();
                    const index = Object.keys($entries).length + 1;
                    roulette.addEntry({
                        id,
                        name: `Entry ${index}`,
                    });
                }}
            >
                Add Entry
            </button>
        </div>
        <div class="right">
            roulette
            <Roulette {roulette} />
            {JSON.stringify($state)}
            <AssetButton />
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        align-items: start;
        justify-content: flex-start;
        gap: 1rem;
        width: 100%;
        height: 100vh;
        padding: 1rem;
        background: var(--color-bg-1);
    }

    .left {
        padding: 1rem;
        width: 100%;
        height: calc(100% - 80px);
        overflow: auto;
        background: var(--color-bg-2);
    }

    .right {
        padding: 1rem;
        width: 100%;
        background: var(--color-bg-2);
    }
</style>
