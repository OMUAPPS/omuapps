<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { Chat, events } from '@omujs/chat';
    import { Message } from '@omujs/chat/models/message.js';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Omu } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import EntryList from './components/EntryList.svelte';
    import RouletteRenderer from './components/RouletteRenderer.svelte';
    import SpinButton from './components/SpinButton.svelte';
    import { RouletteApp } from './roulette-app.js';

    export let omu: Omu;
    const chat = Chat.create(omu);
    const obs = OBSPlugin.create(omu);
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
        omu.permissions.require(
            permissions.OBS_SOURCE_READ_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }
</script>

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
            <h3>
                <span>
                    <i class="ti ti-users" />
                    募集設定
                </span>
            </h3>
            <section class="join-settings">
                <span style="flex: 1;">
                    <Tooltip>
                        参加キーワードを設定すると、チャットにそのキーワードが含まれるメッセージを受信したときに、
                        エントリーを追加します。
                    </Tooltip>
                    <input
                        type="text"
                        placeholder="参加キーワード"
                        bind:value={joinKeyword}
                        class="join-keyword"
                    />
                </span>
                <button
                    class:recruiting={$state.type === 'recruiting'}
                    on:click={() => roulette.toggleRecruiting()}
                >
                    {#if $state.type === 'recruiting'}
                        募集を終了
                        <i class="ti ti-player-pause" />
                    {:else}
                        募集を開始
                        <i class="ti ti-player-play" />
                    {/if}
                </button>
            </section>
        {/if}
        <h3>
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
                            name: '',
                        });
                    }}
                >
                    <Tooltip>エントリーを増やす</Tooltip>
                    追加
                    <i class="ti ti-plus" />
                </button>
            </span>
        </h3>
        <section class="entries">
            <EntryList {roulette} />
        </section>
    </div>
    <div class="right">
        <div class="buttons">
            <AssetButton {omu} {obs} />
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
</main>

<style lang="scss">
    $margin: 0.25rem;

    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: start;
        justify-content: flex-start;
        gap: 1rem;
        padding: 2rem;
        background: var(--color-bg-1);
        overflow: hidden;
    }

    .left {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 22rem;
        height: 100%;
        background: var(--color-bg-2);
    }

    .tabs {
        display: flex;
        flex-direction: row;
        margin: 0 $margin;
        gap: $margin;
        padding-top: $margin;
        margin-bottom: $margin;
        padding-bottom: 1rem;

        button {
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

    .join-settings {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;

        > span {
            flex: 1;
        }

        input.join-keyword {
            flex: 1;
            padding: 0.25rem 0.2rem;
            border: none;
            border-bottom: 1px solid var(--color-outline);
            font-size: 1rem;
            width: 100%;

            &:focus {
                outline: none;
                border-bottom: 2px solid var(--color-1);
            }

            &::placeholder {
                font-size: 0.8rem;
            }
        }

        > button {
            white-space: nowrap;
        }
    }

    .entries {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow: auto;
        height: 100%;
    }

    h3 {
        padding: 0 1.5rem;
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 1rem;
    }

    section {
        padding: 0 1.5rem;
        margin-bottom: 2rem;
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
        width: 100%;
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
