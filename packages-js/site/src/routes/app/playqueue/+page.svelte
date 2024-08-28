<script lang="ts">
    import { Chat, models } from '@omujs/chat';
    import { App, Omu } from '@omujs/omu';

    import AppPage from '$lib/components/AppPage.svelte';
    import { AppHeader, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import PlayQueueEntry from './PlayQueueEntry.svelte';
    import { APP, IDENTIFIER } from './app.js';
    import type { Entry } from './playqueue.js';

    const app = new App(IDENTIFIER, {
        version: '0.1.0',
    });
    const omu = new Omu(app);
    setClient(omu);
    const chat = new Chat(omu);
    chat.authors.listen();
    chat.messages.event.add.listen(async (messages) => {
        if (!active) return;
        messages.forEach((message) => {
            if (!message.authorId) return;
            processJoinLeave(message);
        });
    });

    async function processJoinLeave(message: models.Message) {
        const author = message.authorId && (await chat.authors.get(message.authorId.key()));
        if (!author) return;
        const regex = new RegExp(joinWord);
        if (regex.test(message.text)) {
            entries = [
                ...entries,
                {
                    author,
                    message,
                    element: null,
                },
            ];
        } else {
            const regex = new RegExp(leaveWord);
            if (regex.test(message.text)) {
                entries = entries.filter(
                    (entry) => message.authorId && !entry.author.id.isEqual(message.authorId),
                );
            }
        }
    }

    let active: boolean = false;
    let settingOpen: boolean = false;
    let joinWord = '参加';
    let leaveWord = '辞退';
    let entries: Entry[] = [];

    if (BROWSER) {
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP}>
            <div class="actions">
                <button on:click={() => (settingOpen = !settingOpen)}>
                    {#if settingOpen}
                        設定を閉じる
                    {:else}
                        設定を編集
                        <i class="ti ti-chevron-down" />
                    {/if}
                </button>
                <div class="action">
                    <span>
                        {active ? '終了する' : '開始する'}
                    </span>
                    <button class="toggle" on:click={() => (active = !active)} class:active>
                        <i class="ti ti-check" />
                    </button>
                </div>
            </div>
        </AppHeader>
    </header>
    <main>
        {#if settingOpen}
            <div class="settings">
                <span class="setting">
                    <i class="ti ti-arrow-down-right" />
                    参加ワード
                    <input type="text" bind:value={joinWord} />
                </span>
                <span class="setting">
                    <i class="ti ti-arrow-up-right" />
                    辞退ワード
                    <input type="text" bind:value={leaveWord} />
                </span>
            </div>
        {:else}
            <div class="description">
                <div>
                    <span>
                        {joinWord}
                    </span>
                    で参加
                    <span>
                        {leaveWord}
                    </span>
                    で辞退
                </div>
            </div>
        {/if}
        <div class="entries">
            {#each entries as entry}
                <PlayQueueEntry {entry} />
            {/each}
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        display: flex;
        flex-direction: column;
        height: 100%;
        margin: 10px;
        margin: 0;
        background: var(--color-bg-2);
    }

    .actions {
        display: flex;
        flex-direction: row;
        gap: 20px;
        align-items: center;
        margin-left: auto;

        .action {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
        }

        .toggle {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            color: transparent;
            background: var(--color-bg-1);
            border: 1px solid var(--color-1);
            border-radius: 5px;
            outline: none;

            &:hover {
                outline: 1px solid var(--color-1);
            }

            &.active {
                color: var(--color-bg-1);
                background: var(--color-1);
            }

            i {
                font-size: 14px;
            }
        }
    }

    .description {
        padding: 20px 40px;
        font-size: 12px;
        font-weight: 500;
        color: var(--color-1);
        background: var(--color-bg-1);

        div {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: baseline;
            width: fit-content;
            padding: 4px 8px 4px 2px;
        }

        span {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            padding: 5px 10px;
            font-size: 14px;
            font-weight: bold;
            color: var(--color-1);
            background: var(--color-bg-2);
        }
    }

    .settings {
        display: flex;
        flex-direction: row wrap;
        gap: 20px;
        align-items: center;
        width: 100%;
        height: 100px;
        padding: 10px 40px;
        white-space: nowrap;
        border-bottom: 1px solid var(--color-1);

        .setting {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            min-width: 200px;
            font-weight: 500;
            color: var(--color-1);
        }
    }

    .entries {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 10px 0;
        overflow-y: auto;
        background: var(--color-bg-1);
    }
</style>
