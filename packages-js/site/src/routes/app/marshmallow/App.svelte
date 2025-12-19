<script lang="ts">

    import { OmuPermissions } from '@omujs/omu';
    import { AssetButton, ButtonMini, Slider, Tooltip } from '@omujs/ui';
    import Answers from './_components/Answers.svelte';
    import ManageSkins from './_components/ManageSkins.svelte';
    import Messages from './_components/Messages.svelte';
    import MessageView from './_components/MessageView.svelte';
    import { MarshmallowAPI, type User } from './api.js';
    import { ASSET_APP } from './app';
    import { MarshmallowApp } from './marshmallow-app.js';
    import { hasPremium } from './stores';

    interface Props {
        api: MarshmallowAPI;
        logout: () => void;
    }

    let { api, logout }: Props = $props();

    const marshmallowApp = MarshmallowApp.getInstance();
    const { config, screen } = marshmallowApp;

    let search = $state('');

    let user: User | undefined = $state(undefined);

    async function fetchUser() {
        user = await api.user();
        $hasPremium = user.premium;
        const premiumStart = new Date(2025, 11, 10).getTime();
        const premiumEnd = new Date(2025, 11, 28).getTime();
        const now = Date.now();
        if (now > premiumStart && now < premiumEnd) {
            $hasPremium = true;
        }
        if (!$hasPremium) {
            $config.active_skins = {};
        }
    }

    $effect(() => {
        if (api) {
            fetchUser();
        }
    });

    let messageCount = $state(0);
</script>

<main>
    <div class="menu">
        <div class="tab" class:selected={$screen.type === 'messages'}>
            <Messages {api} {search} bind:count={messageCount} />
        </div>
        <div class="tab" class:selected={$screen.type === 'answers'}>
            <Answers {api} {search} />
        </div>
        <div class="tabs">
            <button onclick={() => ($screen = { type: 'messages' })} class:active={$screen.type === 'messages'}>
                新着
                {#if messageCount > 0}
                    <span class="messages-count">
                        {messageCount}
                    </span>
                {/if}
            </button>
            <button onclick={() => ($screen = { type: 'answers' })} class:active={$screen.type === 'answers'}>
                過去の回答
            </button>
            <button onclick={() => {
                $screen = { type: 'skins', state: { type: 'list' } };
            }} class:active={$screen.type === 'skins'}>
                <Tooltip>
                    着せ替える
                </Tooltip>
                <i class="ti ti-cards"></i>
            </button>
        </div>
        {#if $screen.type === 'skins'}
            <div class="skins omu-scroll">
                <ManageSkins bind:state={$screen.state} {fetchUser} />
            </div>
        {:else}
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
                            <ButtonMini onclick={logout}>
                                <Tooltip>
                                    アカウントを切り替える
                                </Tooltip>
                                <i class="ti ti-switch-horizontal"></i>
                            </ButtonMini>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
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
                    OmuPermissions.ASSET_PERMISSION_ID,
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

            &:hover {
                background: var(--color-bg-2);
            }

            &.active {
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

    .skins {
        position: absolute;
        inset: 0;
        top: 4rem;
        left: 1.5rem;
        padding-right: 1rem;
        padding-bottom: 2rem;
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
            display: flex;
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
