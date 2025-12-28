<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { AssetButton, Button, TableList } from '@omujs/ui';
    import { ASSET_APP } from './app';
    import { DEFAULT_CONFIG, type OmikujiApp, type Pattern } from './omikuji-app';

    interface Props {
        omikuji: OmikujiApp;
        chat: Chat;
    }

    let { omikuji, chat }: Props = $props();
    const { config, results: history, testSignal } = omikuji;
</script>

{#snippet patternEntry(pattern: Pattern, remove: () => void)}
    <div class="entry">
        <span>
            <input type="text" placeholder="名前…" bind:value={pattern.name} />
            <Button primary onclick={remove}>
                <i class="ti ti-x"></i>
            </Button>
        </span>
        <small>説明</small>
        <textarea placeholder="説明…" bind:value={pattern.description}></textarea>
    </div>
{/snippet}

<main>
    <div class="preview">
        <div class="asset">
            <AssetButton
                asset={ASSET_APP}
                dimensions={{ width: '500:px', height: '600:px' }}
                permissions={[
                    ChatPermissions.CHAT_PERMISSION_ID,
                ]}
                single
            />
            <Button primary onclick={() => {
                testSignal.notify({
                    author: 'テスト',
                });
            }}>
                テスト
            </Button>
        </div>
        <div class="history">
            <TableList table={history}>
                {#snippet component({ entry })}
                    {#await chat.authors.get(entry.author) then author}
                        <div class="history-entry">
                            <div class="header">
                                <strong class="name">{author ? author.name : entry.name}</strong>
                                <Button primary onclick={async () => {
                                    await history.remove(entry);
                                }}>
                                    取り消す
                                    <i class="ti ti-x"></i>
                                </Button>
                            </div>
                            <div class="result">
                                <p>{entry.pattern.name}</p>
                                <p>{entry.pattern.description}</p>
                            </div>
                        </div>
                    {/await}
                {/snippet}
            </TableList>
        </div>
    </div>
    <div class="sidebar omu-scroll">
        <h3>
            <p>パターン</p>
            <Button onclick={() => {
                $config = DEFAULT_CONFIG;
            }} primary>
                デフォルト
                <i class="ti ti-refresh"></i>
            </Button>
            <Button onclick={() => {
                $config.patterns = [{ name: '', description: '' }, ...$config.patterns];
            }} primary>
                追加
                <i class="ti ti-plus"></i>
            </Button>
        </h3>
        <div class="patterns">
            {#each $config.patterns as pattern, index (index)}
                {@render patternEntry(pattern, () => {
                    $config.patterns = $config.patterns.filter((_, i) => i !== index);
                })}
            {/each}
        </div>
    </div>
</main>

<style lang="scss">
    main {
        display: flex;
        height: 100%;
    }

    .preview {
        display: flex;
        flex-direction: column;
        flex: 1;
        background: var(--color-bg-1);
        margin: 1rem;
    }

    .asset {
        position: relative;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }

    .history {
        flex: 1;
    }

    .history-entry {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--color-outline);
        color: var(--color-1);

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .name {
                font-size: 1.2rem;
            }
        }

        .result {
            background: var(--color-bg-2);
            padding: 0.5rem;
            margin-top: 0.5rem;
        }
    }

    .sidebar {
        width: 30rem;
        box-sizing: border-box;
        overflow-y: auto;
        border-left: 1px solid var(--color-outline);
        padding-left: 1rem;

        h3 {
            position: sticky;
            padding: 1rem 0;
            padding-right: 1rem;
            top: 0;
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
            color: var(--color-1);
            background: linear-gradient(
                to bottom,
                var(--color-bg-1),
                var(--color-bg-1) 80%,
                transparent
            );

            > p {
                margin-right: auto;
            }
        }
    }

    small {
        color: var(--color-1);
    }

    .entry {
        margin-bottom: 1rem;
        background: var(--color-bg-2);
        border: 1px solid var(--color-outline);
        padding: 1rem;
        margin-right: 1rem;
        padding: 1rem;

        span {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
        }

        input[type="text"] {
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 0.5rem;
            background: none;
            border: none;
            border-bottom: 2px solid var(--color-1);
            padding-bottom: 0.5rem;
        }

        textarea {
            width: 100%;
            height: 6rem;
            padding: 0.5rem;
            box-sizing: border-box;
            background: none;
            border: none;

            &:focus {
                outline: 2px solid var(--color-1);
            }
        }
    }
</style>
