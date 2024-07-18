<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat, events } from '@omujs/chat';
    import { Message } from '@omujs/chat/models/message.js';
    import { Omu } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import EntryList from './components/EntryList.svelte';
    import RouletteRenderer from './components/RouletteRenderer.svelte';
    import { RouletteApp } from './roulette-app.js';
    import SpinButton from './components/SpinButton.svelte';

    export let omu: Omu;
    const chat = new Chat(omu);
    const roulette = new RouletteApp(omu);
    const { entries, state, config } = roulette;

    let tab: 'add' | 'join' = 'join';
    let joinKeyword = '';

    async function onMessage(message: Message) {
        if (tab !== 'join') return;
        if ($state.type !== 'recruiting') return;
        if (!message.authorId) return;

        if (message.text.includes(joinKeyword)) {
            const id = `join-${message.authorId.key()}`;
            const author = await chat.authors.get(message.authorId.key());
            if ($entries[id] && !$config.editable) return;
            roulette.addEntry({
                id,
                name: author?.name || '',
                message: message.toJson(),
            });
        }
    }

    chat.on(events.message.add, (message) => onMessage(message));
    chat.messages.listen();

    if (BROWSER) {
        omu.start();
    }
</script>

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
</div>
<div class="right">
    <div class="buttons">
        <AssetButton />
    </div>
    <div class="roulette">
        <RouletteRenderer {roulette} />
        {#if $state.type === 'spin-result'}
            <div class="result">
                <p>{$state.result.entry.name}</p>
            </div>
        {/if}
    </div>
    <SpinButton {roulette} />
    <div class="settings">
        <h3>Settings</h3>
        <p>state: {$state.type}</p>
        <!-- duration -->
        <label for="duration-input">duration</label>
        <input type="range" min="1" max="10" step="1" bind:value={$config.duration} />
        <input id="duration-input" type="number" bind:value={$config.duration} />s
    </div>
</div>

<style lang="scss">
    $left: 22rem;
    $margin: 0.25rem;

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
        height: calc(100% - 2rem);
    }

    .roulette {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;

        > .result {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: color-mix(in srgb, var(--color-bg-1) 80%, transparent 0%);
            color: var(--color-1);
            font-size: 2rem;
            font-weight: bold;
        }
    }
</style>
