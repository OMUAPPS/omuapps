<script lang="ts">
    import { chat } from '$lib/client.js';
    import { t } from '$lib/i18n/i18n-context.js';
    import type { models } from '@omujs/chat';
    import { Spinner, Tooltip } from '@omujs/ui';

    export let cancel: () => void = () => {};
    
    let stage: {
        type: 'input',
    } | {
        type: 'searching',
    } | {
        type: 'select',
    } = { type: 'input' };

    let url = '';
    let result: {channel: models.Channel, checked: boolean}[] = [];

    async function search(url: string) {
        stage = { type: 'searching' };
        const res = await chat.createChannelTree(url);
        stage = { type: 'select' };
        result = res.map((channel, i) => ({ channel, checked: i === 0 }));
    }
</script>

<div class="setup">
    <div class="left">
        {#if stage.type === 'input'}
            <p>{$t('page.connect.input_url')}</p>
            <input type="text" bind:value={url} on:keypress={(event) => {
                if (event.key === 'Enter') {
                    search(url);
                }
            }} placeholder="youtube.com/watch?v=..." class="input" />
            <div class="actions">
                <button on:click={() => {
                    cancel();
                }} class="back">
                    <i class="ti ti-chevron-left"></i>
                    {$t('page.connect.input_cancel')}
                </button>
                <button on:click={() => {
                    search(url);
                }} disabled={!url}>
                    {$t('page.connect.input_submit')}
                    <i class="ti ti-arrow-right"></i>
                </button>
            </div>
        {:else if stage.type === 'searching'}
            <p>
                {$t('page.connect.searching')}
                <Spinner />
            </p>
        {:else if result.length === 0}
            <p>{$t('page.connect.search_no_results')}</p>

            <div class="actions left">
                <button on:click={() => {
                    stage = { type: 'input' };
                }}>
                    <i class="ti ti-chevron-left"></i>
                    {$t('page.connect.search_back')}
                </button>
            </div>
        {:else}
            <p>{$t('page.connect.select_channel')}</p>
            <div class="channels">
                {#each result as {channel, checked} (channel.id)}
                    <button class="channel" class:checked={checked} on:click={() => {
                        checked = !checked;
                    }}>
                        {#if checked}
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
                {/each}
            </div>
            <div class="actions">
                <button class="back" on:click={() => {
                    stage = { type: 'input' };
                }}>
                    <i class="ti ti-chevron-left"></i>
                    {$t('page.connect.search_back')}
                </button>
                <button on:click={() => {
                    const selected = result.filter((item) => item.checked).map((item) => item.channel);
                    chat.channels.add(...selected);
                }} disabled={result.every((item) => !item.checked)}>
                    {#if result.every((item) => !item.checked)}
                        <Tooltip>
                            <p>{$t('page.connect.select_submit_tooltip')}</p>
                        </Tooltip>
                    {/if}
                    {$t('page.connect.select_submit')}
                    <i class="ti ti-check"></i>
                </button>
            </div>
        {/if}
    </div>
    <div class="right">
        {#if stage.type === 'input'}
            <p>{$t('page.connect.setup_input')}</p>
            <small>{$t('page.connect.setup_input_tooltip')}</small>
        {:else if stage.type === 'searching'}
            <p>{$t('page.connect.setup_searching')}</p>
            <small>{$t('page.connect.setup_searching_tooltip')}</small>
        {:else if result.length === 0}
            <p>{$t('page.connect.setup_no_results')}</p>
            <small>{$t('page.connect.setup_no_results_tooltip')}</small>
        {:else}
            <p>{$t('page.connect.setup_select')}</p>
            <small>{$t('page.connect.setup_select_tooltip')}</small>
        {/if}
    </div>
</div>

<style lang="scss">
    .setup {
        position: absolute;
        inset: 0;
        bottom: 5.5rem;
        display: flex;
        align-items: stretch;
        justify-content: center;
        color: var(--color-text);
        font-weight: bold;
    }

    .input {
        padding: 0.5rem;
        margin-top: 1rem;
        width: 100%;
        background: var(--color-bg-1);
        color: var(--color-1);
        border: 1px solid var(--color-outline);
        border-radius: 2px;
        font-size: 0.8rem;
        font-weight: 600;

        &:focus {
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }

        &::placeholder {
            color: var(--color-text);
            font-size: 0.8rem;
        }
    }

    .channels {
        display: flex;
        flex-direction: column;
        flex: 1;
        max-height: fit-content;
        gap: 0.25rem;
        border-top: 1px solid var(--color-outline);
        border-bottom: 1px solid var(--color-outline);
        padding-top: 1rem;
        padding-bottom: 1rem;
        margin: 1rem 0;
        overflow-y: auto;
        overflow-x: hidden;

        .channel {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            background: var(--color-bg-1);
            border: none;
            font-weight: 600;
            box-shadow: 3px 5px rgba(255, 255, 255, 0.02);
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

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
    }

    .actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;

        &.left {
            justify-content: flex-start;
        }

        > button {
            display: flex;
            align-items: baseline;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1.5rem;
            background: var(--color-1);
            color: var(--color-bg-1);
            border: none;
            border-radius: 2px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-top: 2rem;

            &.back {
                background: var(--color-bg-1);
                color: var(--color-1);
            }

            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }

            &:disabled {
                background: var(--color-bg-1);
                color: var(--color-text);
                outline: 1px solid var(--color-text);
                outline-offset: -1px;
                cursor: not-allowed;
            }
        }
    }

    .setup > .left {
        display: flex;
        flex-direction: column;
        width: 24rem;
        margin: 4rem 1rem;
        padding: 2rem;
        margin-left: 4rem;
        background: var(--color-bg-2);
        box-shadow: 3px 5px rgba(0, 0, 0, 0.02);
        outline: 4px solid #fff;
        outline-offset: -4px;
        border-radius: 2px;

        > p {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            color: var(--color-1);
            font-size: 0.7621rem;
            padding-bottom: 2.25rem;
        }
    }

    .setup > .right {
        display: flex;
        flex-direction: column;
        margin: 4rem 1rem;
        padding-top: 1.5rem;
        flex: 1;
        padding-left: 1rem;

        > p {
            color: var(--color-1);
            font-size: 1.5rem;
        }

        > small {
            font-size: 0.8rem;
        }
    }

    button:focus-visible {
        outline: 2px solid var(--color-1);
        outline-offset: 2px;
    }
</style>
