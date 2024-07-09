<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { RouletteApp } from './roulette-app.js';
    import Roulette from './components/Roulette.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import RouletteEntry from './components/RouletteEntry.svelte';

    const omu = new Omu(APP);
    setClient(omu);
    const roulette = new RouletteApp(omu);
    const { entries, state, config } = roulette;

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

    let tab: 'add' | 'join' = 'add';

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
            <div class="tabs">
                <button on:click={() => (tab = 'add')} class:selected={tab === 'add'}>
                    <i class="ti ti-plus" />
                    自分で追加
                </button>
                <button on:click={() => (tab = 'join')} class:selected={tab === 'join'}>
                    <i class="ti ti-user" />
                    視聴者参加
                </button>
            </div>
            <div class="controls">
                {#if tab === 'add'}
                    <div class="between">
                        <span>entries</span>
                        <span>
                            <button on:click={() => roulette.clearEntries()}> Clear </button>
                            <button
                                on:click={() => {
                                    const id = Date.now().toString();
                                    roulette.addEntry({
                                        id,
                                        name: ``,
                                    });
                                }}
                            >
                                Add Entry
                            </button>
                        </span>
                    </div>
                    <div class="entries">
                        {#each Object.entries($entries) as [id, item], index (id)}
                            <RouletteEntry {index} {item} {roulette} />
                        {/each}
                    </div>
                {:else if tab === 'join'}
                    <button on:click={spin}>Spin</button>
                    <button on:click={test}>Test</button>
                    <p>entries</p>
                    <button on:click={() => roulette.clearEntries()}> Clear </button>
                    {#each Object.entries($entries) as [id, entry] (id)}
                        <div class="entry">
                            <input
                                type="text"
                                bind:value={entry.name}
                                on:input={() => {
                                    roulette.updateEntry(entry);
                                }}
                            />
                            <button
                                on:click={() => {
                                    roulette.removeEntry(id);
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    {/each}
                {/if}
            </div>
            <div class="buttons">
                <button on:click={spin}>Spin</button>
            </div>
        </div>
        <div class="right">
            <div class="buttons">
                <AssetButton />
            </div>
            <div class="roulette">
                <Roulette {roulette} />
            </div>
            <div class="settings">
                <h3>Settings</h3>
                <p>entries: {Object.keys($entries).length}</p>
                <p>state: {$state.type}</p>
                <!-- duration -->
                <label for="duration-input">duration</label>
                <input type="range" min="1" max="10" step="1" bind:value={$config.duration} />
                <input id="duration-input" type="number" bind:value={$config.duration} />s
            </div>
        </div>
    </main>
</AppPage>

<style lang="scss">
    $left: 25rem;
    $margin: 0.25rem;

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
        position: absolute;
        top: 1rem;
        bottom: 1rem;
        width: $left;
        height: calc(100% - 2rem);
        overflow: auto;
        background: var(--color-bg-2);

        .tabs {
            display: flex;
            flex-direction: row;
            margin: 0 $margin;
            gap: $margin;
            padding-top: $margin;
            margin-bottom: $margin;

            > button {
                padding: 0.5rem 1rem;
                flex: 1;
                background: none;
                border: none;
                border-bottom: 2px solid var(--color-bg-1);
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: bold;
                color: var(--color-1);

                &.selected {
                    border-bottom: 2px solid var(--color-1);
                }

                &:hover {
                    background: var(--color-bg-1);
                }
            }
        }

        > .buttons {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;

            > button {
                position: absolute;
                left: $margin;
                right: $margin;
                bottom: $margin;
                padding: 0.5rem 1rem;
                background: var(--color-1);
                color: var(--color-bg-1);
                font-weight: bold;
                cursor: pointer;
                border: none;
            }
        }

        > .controls {
            padding: 1rem;
            gap: 1rem;
            display: flex;
            flex-direction: column;
        }
    }

    .between {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.5rem;
    }

    button {
        background: var(--color-1);
        color: var(--color-bg-1);
        padding: 0.25rem 0.5rem;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .entries {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .right {
        position: absolute;
        top: 1rem;
        left: 25rem;
        right: 1rem;
        bottom: 1rem;
        margin-left: 2rem;
        overflow: auto;
        background: var(--color-bg-2);
        height: calc(100% - 2rem);
        padding: 1rem;

        > .buttons {
        }
    }

    .roulette {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
