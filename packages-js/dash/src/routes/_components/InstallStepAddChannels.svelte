<script lang="ts">
    import { chat } from '$lib/client';
    import { t } from '$lib/i18n/i18n-context';
    import { Button, Spinner, Textbox, Tooltip } from '@omujs/ui';
    import type { AddChannelStatus } from '../stores';

    export let state: AddChannelStatus;
    export let resolve: () => void;

    const URL_REGEX = /[\w-]+\.[\w-]+(\/[\w-./?%&=]*)?/;

    let url: string = '';

    async function search() {
        state = { type: 'searching' };
        const channels = await chat.createChannelTree(url);
        state = {
            type: 'result',
            channels: await Promise.all(channels.map(async (channel) => ({
                channel,
                added: await chat.channels.has(channel.id.key()),
            }))),
        };
    }

    async function finish() {
        if (state.type !== 'result') {
            resolve();
            return;
        }
        const addedChannels = state.channels
            .filter(({ added }) => added)
            .map(({ channel }) => channel);
        await chat.channels.add(...addedChannels);
        resolve();
    }
</script>

<div class="step">
    {#if state.type === 'idle'}
        <Textbox bind:value={url} placeholder="https://..." />
        <div class="actions">
            <Button onclick={resolve}>
                <Tooltip>
                    一旦飛ばして後で追加
                </Tooltip>
                スキップ
                <i class="ti ti-chevron-right"></i>
            </Button>
            <Button onclick={search} primary disabled={!URL_REGEX.test(url)}>
                {#if !url}
                    <Tooltip>
                        チャンネルURLを入力してください
                    </Tooltip>
                {:else if !URL_REGEX.test(url)}
                    <Tooltip>
                        有効なURLを入力してください
                    </Tooltip>
                {/if}
                検索
                <i class="ti ti-search"></i>
            </Button>
        </div>
    {:else if state.type === 'searching'}
        <p>
            検索中
            <Spinner />
        </p>
    {:else if state.type === 'result'}
        <div class="channels">
            {#each state.channels as { channel, added }, index (index)}
                <button class="channel" class:checked={added} onclick={() => {
                    added = !added;
                }}>
                    {#if added}
                        <Tooltip>
                            <p>{$t('page.connect.selected_tooltip')}</p>
                        </Tooltip>
                        <i class="ti ti-circle-check-filled"></i>
                    {:else}
                        <Tooltip>
                            <p>{$t('page.connect.select_tooltip')}</p>
                        </Tooltip>
                        <i class="ti ti-plus"></i>
                    {/if}
                    <img src={channel.iconUrl} alt="thumbnail" />
                    <div class="info">
                        <p>{channel.name}</p>
                        <small>{channel.url}</small>
                    </div>
                </button>
            {:else}
                <small>チャンネルを見つけることができませんでした。</small>
            {/each}
        </div>
        <div class="actions">
            <Button onclick={() => {
                state = { type: 'idle' };
            }}>
                <i class="ti ti-search"></i>
                もう一度検索
            </Button>
            <Button onclick={finish} primary disabled={state.channels.length > 0 && state.channels.every(({ added }) => !added)}>
                <Tooltip>
                    {#if state.channels.some(({ added }) => added)}
                        追加して終了
                    {:else}
                        一つ以上選んでください
                    {/if}
                </Tooltip>
                {#if state.channels.length > 0}
                    追加して終了
                {:else}
                    追加せずに終了
                {/if}
                <i class="ti ti-check"></i>
            </Button>
        </div>
    {/if}
</div>

<style lang="scss">
    .step {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-top: auto;
    }

    .actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .channels {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        height: 14rem;
        overflow-y: auto;
        overflow-x: hidden;
        border-top: 1px solid var(--color-outline);
        border-bottom: 1px solid var(--color-outline);
        padding: 1rem 0;

        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }

        > small {
            color: var(--color-1);
        }

        > .channel {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            margin: 0 1px;
            background: var(--color-bg-1);
            border: none;
            font-weight: 600;
            box-shadow: 3px 5px rgba(255, 255, 255, 0.02);
            outline: 1px solid var(--color-outline);
            border-radius: 2px;

            > i {
                margin-right: 0.75rem;
                font-size: 1.25rem;

                &.ti-plus {
                    font-size: 0.8rem;
                }
            }

            > img {
                width: 2rem;
                height: 2rem;
                border-radius: 100%;
            }

            > .info {
                margin-left: 0.5rem;
                display: flex;
                flex-direction: column;
                align-items: flex-start;

                > p {
                    color: var(--color-1);
                    font-size: 0.8621rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                > small {
                    color: var(--color-text);
                    font-size: 0.6rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            }

            &.checked {
                border-left: 2px solid var(--color-1);

                > i {
                    color: var(--color-1);
                }
            }

            &:hover {
                box-shadow: 0 0.25rem 0 0px color-mix(in srgb, var(--color-bg-1) 50%, transparent 0%);
                background: var(--color-bg-2);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }
</style>
