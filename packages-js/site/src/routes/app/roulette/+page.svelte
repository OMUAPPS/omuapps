<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat, events } from '@omujs/chat';
    import { content } from '@omujs/chat/models/index.js';
    import { Message } from '@omujs/chat/models/message.js';
    import { Identifier, Omu } from '@omujs/omu';
    import { AppHeader, setClient, Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import EntryList from './components/EntryList.svelte';
    import RouletteRenderer from './components/RouletteRenderer.svelte';
    import { RouletteApp } from './roulette-app.js';

    const omu = new Omu(APP);
    setClient(omu);
    const chat = new Chat(omu);
    const roulette = new RouletteApp(omu);
    const { entries, state, config } = roulette;

    let tab: 'add' | 'join' = 'join';
    let joinKeyword = '';

    function onMessage(message: Message) {
        if ($state.type !== 'recruiting') return;

        if (message.text.includes(joinKeyword)) {
            const id = `join-${message.authorId}`;
            if ($entries[id] && !$config.editable) return;
            roulette.addEntry({
                id,
                name: message.text,
                message,
            });
        }
    }

    chat.on(events.message.add, (message) => onMessage(message));

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
                    <Tooltip>好きなエントリーだけで</Tooltip>
                    <i class="ti ti-plus" />
                    自分で追加
                </button>
                <button on:click={() => (tab = 'join')} class:selected={tab === 'join'}>
                    <Tooltip>視聴者が参加できる</Tooltip>
                    <i class="ti ti-user" />
                    視聴者参加
                </button>
            </div>
            {#if tab === 'join'}
                <div class="join-tab">
                    <span>
                        <i class="ti ti-users" />
                        募集設定
                    </span>
                    <div class="join-settings">
                        <input type="text" placeholder="参加キーワード" bind:value={joinKeyword} />
                        <button
                            class="join-button"
                            class:recruiting={$state.type === 'recruiting'}
                            on:click={() => roulette.toggleRecruiting()}
                        >
                            {#if $state.type === 'recruiting'}
                                募集中
                            {:else}
                                募集開始
                            {/if}
                        </button>
                    </div>
                </div>
            {/if}
            <div class="between">
                <span>
                    <i class="ti ti-list-numbers" />
                    エントリー
                </span>
                <span>
                    <button on:click={() => roulette.clearEntries()}>
                        <Tooltip>エントリーをすべて消す</Tooltip>
                        クリア
                        <i class="ti ti-trash" />
                    </button>
                    <button
                        on:click={() => {
                            const id = Date.now().toString();
                            roulette.addEntry({
                                id,
                                name: ``,
                            });
                        }}
                    >
                        <Tooltip>エントリーを増やす</Tooltip>
                        追加
                        <i class="ti ti-plus" />
                    </button>
                </span>
            </div>
            <EntryList {roulette} />
            <div class="spin-button">
                {#if $state.type === 'idle' || $state.type === 'recruiting'}
                    {@const empty = Object.keys($entries).length === 0}
                    <button on:click={() => roulette.spin()} disabled={empty}>
                        <Tooltip>
                            {#if empty}
                                エントリーがありません
                            {:else}
                                ルーレットを回す
                            {/if}
                        </Tooltip>
                        {#if empty}
                            エントリーを追加して回す
                        {:else}
                            回す
                        {/if}
                        <i class="ti ti-rotate-360" />
                    </button>
                {:else if $state.type === 'spin-result'}
                    <button on:click={() => roulette.stop()}>
                        <Tooltip>このルーレットを終わる</Tooltip>
                        終了
                        <i class="ti ti-check" />
                    </button>
                {:else}
                    <button on:click={() => roulette.stop()}>
                        <Tooltip>このルーレットを強制終了させる</Tooltip>
                        強制終了
                        <i class="ti ti-x" />
                    </button>
                {/if}
            </div>
        </div>
        <div class="right">
            <div class="buttons">
                <AssetButton />
            </div>
            <div class="roulette">
                <RouletteRenderer {roulette} />
            </div>
            {#if $state.type === 'spin-result'}
                <div class="result">
                    <h3>Result</h3>
                    <p>{$state.result.entry.name}</p>
                </div>
            {/if}
            <div class="settings">
                <h3>Settings</h3>
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
    $left: 22rem;
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
        overflow: hidden;
    }

    .tabs {
        display: flex;
        flex-direction: row;
        margin: 0 $margin;
        gap: $margin;
        padding-top: $margin;
        margin-bottom: $margin;
        padding-bottom: 1rem;

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

    .left {
        position: absolute;
        top: 1rem;
        bottom: 1rem;
        width: $left;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: var(--color-bg-2);
    }

    .spin-button {
        margin: 1rem;
        margin-top: auto;

        > button {
            width: 100%;
            padding: 0.5rem 1rem;
            display: flex;
            justify-content: center;
            align-items: baseline;
            gap: 0.3rem;
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            font-weight: bold;
            cursor: pointer;
            border: none;

            &:disabled {
                background: var(--color-bg-1);
                color: var(--color-1);
                cursor: not-allowed;
            }

            &:hover {
                animation: spin-button 0.14s forwards;
            }
        }
    }

    @keyframes spin-button {
        10% {
            gap: 0rem;
        }

        25% {
            transform: scale(0.98);
        }

        50% {
            background: var(--color-1);
            color: var(--color-2);
            outline: 2px solid var(--color-bg-1);
            outline-offset: 3px;
        }

        100% {
            background: var(--color-1);
            color: var(--color-bg-1);
            outline-offset: 1px;
        }
    }

    .join-tab {
        margin: 0 $margin;
        padding: 0 0.5rem;
        margin-bottom: 1rem;

        input {
            flex: 1;
            padding: 0.5rem;
            border: none;
            background: var(--color-bg-1);
            color: var(--color-1);
            font-size: 0.9rem;
        }

        button {
            padding: 0.5rem 1rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
        }
    }

    .join-settings {
        margin-top: 1rem;
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .between {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 1rem;
    }

    button {
        background: var(--color-1);
        color: var(--color-bg-1);
        padding: 0.25rem 0.5rem;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .right {
        position: absolute;
        top: 1rem;
        left: $left;
        right: 1rem;
        bottom: 1rem;
        margin-left: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: auto;
        background: var(--color-bg-2);
        height: calc(100% - 2rem);
        padding: 1rem;
    }

    .roulette {
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
