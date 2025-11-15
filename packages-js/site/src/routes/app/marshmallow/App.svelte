<script lang="ts">
    import { OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AssetButton, Button, Slider, Tooltip } from '@omujs/ui';
    import Answers from './Answers.svelte';
    import { MarshmallowAPI, type Message, type User } from './api.js';
    import { ASSET_APP } from './app';
    import { MarshmallowApp } from './marshmallow-app.js';
    import Messages from './Messages.svelte';
    import MessageView from './MessageView.svelte';
    import { hasPremium } from './stores';

    export let omu: Omu;
    export let marshmallow: MarshmallowApp;
    export let obs: OBSPlugin;
    export let api: MarshmallowAPI;
    export let logout: () => void;

    const { config } = marshmallow;

    let tab: 'messages' | 'answers' = 'messages';
    let messages: Record<string, Message> | undefined;
    let search = '';

    let user: User | undefined = undefined;

    async function fetchUser() {
        user = await api.user();
        $hasPremium = user.premium;
    }

    $: {
        if (api) {
            fetchUser();
        }
    };

    let refreshMessages: () => void;
    let refreshAnswers: () => void;
</script>

<main>
    <div class="menu">
        <div class="tab" class:selected={tab === 'messages'}>
            <Messages {api} {search} bind:messages bind:refresh={refreshMessages} />
        </div>
        <div class="tab" class:selected={tab === 'answers'}>
            <Answers {api} {search} bind:refresh={refreshAnswers} />
        </div>
        <div class="tabs">
            <button on:click={() => (tab = 'messages')} disabled={tab === 'messages'}>
                新着
                {#if Object.keys(messages ?? {}).length > 0}
                    <span class="messages-count">
                        {Object.keys(messages ?? {}).length}
                    </span>
                {/if}
            </button>
            <button on:click={() => (tab = 'answers')} disabled={tab === 'answers'}>
                過去の回答
            </button>
            <Button primary onclick={() => {
                if (tab === 'messages') {
                    refreshMessages?.();
                } else {
                    refreshAnswers?.();
                }
            }}>
                <Tooltip>再読み込み</Tooltip>
                <i class="ti ti-reload"></i>
            </Button>
        </div>
        <div class="bottom">
            <div class="search">
                <input bind:value={search} placeholder="検索" />
                <i class="ti ti-search"></i>
            </div>
            <div class="user">
                {#if user}
                    <img src={user.image} alt="">
                    <span>
                        <a href={`https://marshmallow-qa.com/${api.session.displayId}`} target="_blank">{user.nickname}</a>
                        {#if user.premium}
                            <Tooltip>
                                プレミアム会員
                            </Tooltip>
                            <i class="ti ti-crown"></i>
                        {/if}
                    </span>
                    <div class="actions">
                        <Button onclick={logout}>
                            <Tooltip>
                                アカウントを切り替える
                            </Tooltip>
                            <i class="ti ti-switch-horizontal"></i>
                        </Button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
    <div class="content">
        <MessageView {api} />
        <div class="asset">
            <small>ズーム</small>
            <Slider bind:value={$config.scale} min={-1} max={1} step={1 / 8} />
            <AssetButton
                asset={ASSET_APP}
                permissions={[
                    OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
                    OmuPermissions.REGISTRY_PERMISSION_ID,
                    OmuPermissions.TABLE_PERMISSION_ID,
                ]}
            />
        </div>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        height: 100%;
    }

    .menu {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 20rem;
        border-right: 1px solid var(--color-outline);
    }

    .tabs {
        position: absolute;
        left: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.25rem;
        padding: 0.5rem 0;
        padding-right: 0.5rem;
        padding-bottom: 1rem;
        background: linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-1) 98%, transparent 0%) 90%, transparent);

        > button {
            background: none;
            border: none;
            padding: 0.5rem 1rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            color: var(--color-1);
            border-bottom: 2px solid transparent;
            width: 100%;

            &:hover {
                background: var(--color-bg-2);
            }

            &:disabled {
                border-color: var(--color-1);
                cursor: default;
                background: var(--color-active);
            }
        }
    }

    .tab {
        flex: 1;
        display: none;
        position: absolute;
        inset: 0;

        &.selected {
            display: block;
        }
    }

    .bottom {
        position: absolute;
        left: 0;
        right: 0.5rem;
        bottom: 0;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        border-top: 1px solid var(--color-outline);
    }

    .search {
        position: relative;

        > input {
            position: relative;
            border: 0;
            height: 2rem;
            width: 100%;
            padding-left: 1rem;
            padding-right: 1rem;
            padding-top: 1.5rem;
            padding-bottom: 2rem;
            background: none;

            &:focus {
                outline: 0;
            }

            &::placeholder {
                font-size: 0.8rem;
                line-height: 2.5;
            }
        }

        > i {
            position: absolute;
            right: 1.5rem;
            bottom: 1.4rem;
            pointer-events: none;
            color: var(--color-1);
        }

        &::before {
            content: '';
            position: absolute;
            left: 1rem;
            right: 1rem;
            bottom: 0.8rem;
            height: 1px;
            background: var(--color-1);
        }
    }

    .user {
        padding: 1rem 1rem;
        border-top: 1px solid var(--color-outline);
        display: flex;
        align-items: center;
        color: var(--color-1);
        font-size: 0.8621rem;

        > img {
            width: 2rem;
            height: 2rem;
            margin-right: 0.5rem;
            border-radius: 100%;
            outline: 1px solid var(--color-outline);
            outline-offset: -1px;
        }

        > .actions {
            margin-left: auto;
        }
    }

    .messages-count {
        background: var(--color-1);
        color: var(--color-bg-1);
        border-radius: 9999px;
        padding: 0.1rem 0.5rem;
        font-size: 0.75rem;
        margin-left: 0.5rem;
        font-weight: 600;
    }

    .content {
        position: relative;
        flex: 1;
    }

    .asset {
        position: absolute;
        left: 2rem;
        bottom: 2.5rem;
        color: var(--color-1);
    }
</style>
