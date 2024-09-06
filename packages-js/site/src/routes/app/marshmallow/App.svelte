<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import AccountSwitcher from './components/AccountSwitcher.svelte';
    import MessageView from './components/MessageView.svelte';
    import SelectUser from './components/SelectUser.svelte';
    import { MarshmallowApp, type Message, type User } from './marshmallow-app.js';

    export let omu: Omu;
    export let marshmallow: MarshmallowApp;
    export let obs: OBSPlugin;
    const { config, data } = marshmallow;

    let user: User | null = null;
    let users: Record<string, User> | null = null;
    let state: 'loading_users' | 'user_notfound' | 'user_select' | 'loading_messages' | 'loaded' =
        'loading_users';

    async function getUsers() {
        state = 'loading_users';
        const result = await marshmallow.getUsers();
        users = result;
        console.log(result);
        state = 'loaded';
        if (Object.keys(users).length === 0) {
            state = 'user_notfound';
            return;
        }
        if ($config.user && users[$config.user]) {
            user = users[$config.user];
        } else if (Object.keys(users).length === 1) {
            user = users[Object.keys(users)[0]];
        } else {
            state = 'user_select';
        }
        refreshPromise = null;
    }

    async function refreshUsers() {
        state = 'loading_users';
        const result = await marshmallow.refreshUsers();
        users = result;
        console.log(result);
        state = 'loaded';
        if (Object.keys(users).length === 0) {
            state = 'user_notfound';
            return;
        }
        if ($config.user && users[$config.user]) {
            user = users[$config.user];
        } else if (Object.keys(users).length === 1) {
            user = users[Object.keys(users)[0]];
        } else {
            state = 'user_select';
        }
        refreshPromise = null;
    }

    $: {
        $config.user = user?.name || null;
    }

    let messages: Message[] = [];

    async function refreshMessages(user: User) {
        messages = [];
        state = 'loading_messages';
        marshmallow
            .getMessages(user.name)
            .then((res) => {
                console.log(res);
                messages = res;
            })
            .finally(() => {
                state = 'loaded';
            });
    }

    $: {
        if (user) {
            refreshMessages(user);
        }
    }

    let refreshPromise: Promise<void> | null = getUsers();

    let container: HTMLDivElement;
</script>

<main>
    <div class="left">
        <AccountSwitcher {users} bind:user />
        <div class="messages">
            {#if state === 'loading_messages'}
                <div class="loading">
                    <i class="ti ti-loader-2" />
                    メッセージを読み込んでいます…
                </div>
            {:else}
                {#if user}
                    <button class="refresh" on:click={() => user && refreshMessages(user)}>
                        <Tooltip>読み込み直して新しいメッセージを表示する</Tooltip>
                        更新
                        <i class="ti ti-reload" />
                    </button>
                {/if}
                {#each messages as item}
                    {@const selected = $data.message === item}
                    <button
                        class="message"
                        class:selected
                        on:click={() => {
                            $data.message = selected ? null : item;
                            $data.scroll = 0;
                            container.scrollTop = 0;
                        }}
                    >
                        <Tooltip>
                            {#if selected}
                                クリックで選択を解除
                                <i class="ti ti-x" />
                            {:else}
                                クリックでメッセージを表示
                                <i class="ti ti-chevron-right" />
                            {/if}
                        </Tooltip>
                        <p>{item.content}</p>
                        {#if selected}
                            <i class="ti ti-chevron-right" />
                        {/if}
                    </button>
                {/each}
            {/if}
        </div>
        <div class="asset">
            <small>OBSで使用する場合は以下のボタンから</small>
            <AssetButton {omu} {obs} />
        </div>
    </div>
    <div class="right" bind:this={container}>
        {#if $data.message}
            <MessageView {marshmallow} bind:message={$data.message} />
        {:else}
            <div class="select-message">
                メッセージを選択してください。
                <small> メッセージを選択すると、メッセージを表示できます。 </small>
            </div>
        {/if}
    </div>
</main>
{#if state === 'loading_users'}
    <div class="modal">
        {#await refreshPromise}
            <i class="ti ti-loader-2 spin" />
            <p>ブラウザからユーザー情報を読み込んでいます…</p>
            <small>これには数分かかる場合があります</small>
        {:catch error}
            <i class="ti ti-alert-circle" />
            <p>ユーザー情報の読み込み中にエラーが発生しました。</p>
            <small>{error.message}</small>
        {/await}
    </div>
{:else if state === 'user_notfound'}
    <div class="modal">
        <i class="ti ti-alert" />
        ユーザーの認証情報が見つかりませんでした。 ブラウザでログインしてもういちどお試しください。
        <button on:click={() => (refreshPromise = refreshUsers())}>もう一度試す</button>
    </div>
{:else if state === 'user_select'}
    {#if users}
        <SelectUser {users} bind:user />
    {/if}
{/if}

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: row;
        height: 100%;
    }

    .refresh {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem 2rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        width: 100%;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;

        > i {
            font-size: 1rem;
        }

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            transition-duration: 0.0621s;
            transition-property: background, color;
        }
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem 2rem;
        border: none;
        background: var(--color-bg-2);
        color: var(--color-1);
        width: 100%;
        font-size: 0.8rem;

        > i {
            font-size: 1rem;
            animation: spin 1s linear infinite;
        }
    }

    .modal {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        background: var(--color-bg-1);
        opacity: 0.95;
        color: var(--color-1);
        font-size: 1.25rem;

        > i {
            font-size: 2rem;
        }
    }

    .spin {
        animation: spin 1s linear infinite;
        transform-origin: center;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .messages {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;

        > .message {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 1rem 2rem;
            padding-right: 1rem;
            border: none;
            background: var(--color-bg-2);
            border-bottom: 1px solid var(--color-outline);
            width: 100%;
            cursor: pointer;

            > p {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            > i {
                margin-left: auto;
                padding-left: 0.25rem;
            }

            &.selected,
            &:focus,
            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
                outline: none;
                outline-offset: -2px;
                padding-left: 2.25rem;
                transition-duration: 0.0621s;
                transition-property: padding-left, background, color;
            }
        }
    }

    $left-width: 20rem;

    .left {
        position: absolute;
        top: 0;
        bottom: 0;
        width: $left-width;
        min-width: $left-width;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
    }

    .right {
        position: absolute;
        left: $left-width;
        right: 0;
        top: 0;
        bottom: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        gap: 1rem;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 10px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 2px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }
    }

    .select-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        color: var(--color-1);
    }

    .asset {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem 1rem;
        color: var(--color-1);
    }
</style>
