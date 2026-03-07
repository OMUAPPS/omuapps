<script lang="ts">
    import type { Chat } from '@omujs/chat';
    import { AssetButton, Button, TableList, Textbox, Tooltip } from '@omujs/ui';
    import { openAmazonPrime } from './amazonprime';
    import { ASSET_APP } from './app';
    import Config from './components/Config.svelte';
    import Menu from './components/Menu.svelte';
    import MenuSection from './components/MenuSection.svelte';
    import Player from './components/player/Player.svelte';
    import RoomEntry from './components/RoomEntry.svelte';
    import { openNetflix } from './netflix';
    import { ReplayApp } from './replay-app.js';
    import { formatTime, getTimeUnits, time } from './time';

    interface Props {
        chat: Chat;
    }

    let { chat }: Props = $props();

    const replay = ReplayApp.getInstance();
    const { replayData } = replay;

    let search: string = $state('');

    let showConfig = $state(false);

    let provider: 'menu' | 'from_url' | 'recent' = $state('menu');
</script>

<div class="container">
    <div class="content">
        <div class="player">
            {#if $replayData?.video.type === 'netflix' || $replayData?.video.type === 'amazonprime'}
                {@const { info, playback } = $replayData}
                {@const units = getTimeUnits(info.duration ?? 0)}
                <div class="video-info">
                    <img src={info.thumbnailUrl} alt="">
                    <h3>{info.title}</h3>
                    <small>{info.description}</small>
                    <div class="timer">
                        <progress value={(playback.playing ? $time - playback.start : 0) / 1000 + playback.offset} max={info.duration}></progress>
                        <div class="time">
                            <span>{formatTime((playback.playing ? $time - playback.start : 0) / 1000 + playback.offset, units)}</span>
                            <span>{info.duration ? formatTime(info.duration) : '...'}</span>
                        </div>
                    </div>
                </div>
            {:else}
                {#if $replayData}
                    <Player bind:replayData={$replayData} bind:playback={$replayData.playback} />
                {:else}
                    <div class="empty">
                        動画を選択するとここに表示されます
                        <i class="ti ti-video"></i>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
    <Menu>
        {#if provider !== 'menu'}
            <Button primary onclick={() => {
                provider = 'menu';
            }}>
                <i class="ti ti-chevron-left"></i>
                戻る
            </Button>
        {/if}
        {#if provider === 'menu'}
            <MenuSection name="動画を選択する" icon="ti-search" gap>
                <Button primary onclick={() => {
                    provider = 'from_url';
                }}>
                    URLから
                </Button>
                <Button primary onclick={() => {
                    provider = 'recent';
                }}>
                    最近の配信から
                </Button>
                <Button primary onclick={() => {
                    openNetflix();
                }}>
                    Netflixを開く
                </Button>
                <Button primary onclick={() => {
                    openAmazonPrime();
                }}>
                    Amazon Prime Videoを開く
                </Button>
            </MenuSection>
            <hr>
            <MenuSection name="配信ソフトに追加する" icon="ti-arrow-bar-to-down" gap>
                <AssetButton
                    asset={ASSET_APP}
                    dimensions={{ width: '50:%', height: '50:%' }}
                />
                <Button
                    onclick={() => {
                        showConfig = true;
                    }}
                    primary
                >
                    設定
                    <i class="ti ti-settings"></i>
                </Button>
            </MenuSection>
        {:else if provider === 'from_url'}
            <MenuSection name="URLから" icon="ti-link">
                <Textbox
                    placeholder="https://youtu.be/..."
                    on:input={(event) => {
                        const url = new URL(event.detail);
                        replay.playByUrl(url);
                    }}
                    lazy
                />
            </MenuSection>
        {:else if provider === 'recent'}
            <MenuSection name="最近の配信から" icon="ti-video" flex={1}>
                {#snippet actions()}
                    <div class="search">
                        <Tooltip>過去の配信から検索</Tooltip>
                        <input type="search" bind:value={search} placeholder="検索" />
                        {#if !search}
                            <i class="ti ti-search"></i>
                        {/if}
                    </div>
                {/snippet}
                <TableList
                    table={chat.rooms}
                    filter={(_, room) => {
                        if (!room.metadata?.url) return false;
                        if (
                            search &&
                            room.metadata.title
                                ?.toLowerCase()
                                .includes(search.toLowerCase())
                        ) {
                            return false;
                        }
                        return true;
                    }}
                    sort = {(a) => {
                        if (!a.metadata.created_at) return 0;
                        return new Date(a.metadata.created_at).getTime();
                    }}
                >
                    {#snippet component({ entry, selected })}
                        <RoomEntry {entry} {selected} />
                    {/snippet}
                    {#snippet empty()}
                        <p class="no-streams">
                            配信が追加されるとここに表示されます
                        </p>
                    {/snippet}
                </TableList>
            </MenuSection>
        {/if}
    </Menu>
    {#if showConfig}
        <Config bind:showConfig />
    {/if}
</div>

<style lang="scss">
    .container {
        display: flex;
        gap: 2rem;
        flex: 1;
    }

    hr {
        margin-top: auto;
        margin-bottom: 2rem;
        border: none;
        border-top: 1px solid var(--color-outline);
    }

    .search {
        position: relative;
        width: 100%;
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--color-1);
        margin-left: 1rem;

        > input {
            width: 100%;
            border: none;
            background: none;
            color: var(--color-1);
            font-size: 1rem;
            padding: 0.25rem 0.1rem;

            &::placeholder {
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--color-1);
            }

            &:focus {
                outline: none;
            }
        }

        > .ti-search {
            position: absolute;
            right: 0;
            font-size: 0.8rem;
            margin-right: 0.5rem;
            pointer-events: none;
        }
    }

    .no-streams {
        color: var(--color-text);
        background: var(--color-bg-2);
        font-size: 0.8rem;
        opacity: 0.621;
        height: 4rem;
        margin: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex: 1;
        gap: 1rem;
    }

    .player {
        position: relative;
        display: flex;
        align-items: stretch;
        flex: 1;
    }

    .video-info {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        text-align: center;

        > h3 {
            font-size: 2rem;
        }

        > small {
            font-size: 0.8rem;
            color: var(--color-text);
        }

        > img {
            width: 50%;
            height: auto;
            border-radius: 8px;
            margin: 2rem 0;
        }
    }

    .timer {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;

        > progress {
            width: 100%;
            height: 0.5rem;
            appearance: none;
            border: none;
            border-radius: 0.5rem;
            background: var(--color-bg-2);

            &::-webkit-progress-bar {
                background: transparent;
            }

            &::-webkit-progress-value {
                background: var(--color-1);
                border-radius: 0.5rem;
            }
        }

        > .time {
            width: 100%;
            display: flex;
            justify-content: space-between;
        }
    }

    .empty {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        outline: 1px dashed var(--color-outline);
        background: var(--color-bg-2);
        color: #666;
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
