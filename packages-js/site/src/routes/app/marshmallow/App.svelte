<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { TableList, Tooltip } from '@omujs/ui';
    import AccountSwitcher from './components/AccountSwitcher.svelte';
    import MessageEntry from './components/MessageEntry.svelte';
    import MessageView from './components/MessageView.svelte';
    import SelectUser from './components/SelectUser.svelte';
    import { MarshmallowApp, type Message, type User } from './marshmallow-app.js';
    import { selectedMessageId, selectMessage } from './stores.js';

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
        users = await marshmallow.getUsers();
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
        return refreshPromise = marshmallow.refreshUsers().then(async (result) => {
            users = result;
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
        }).finally(() => {
            refreshPromise = null;
        });
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

    $: $selectedMessageId = $data.message?.message_id;
    $selectMessage = (message: Message) => {
        const selected = $selectedMessageId === message.message_id;
        $data.message = selected ? null : message;
        $data.scroll = 0;
        container.scrollTop = 0;
    };

    let tab: 'new' | 'old' = 'new';

    let refreshPromise: Promise<void> | null = getUsers();

    let container: HTMLDivElement;
</script>

<main>
    <div class="left">
        <div class="messages">
            {#if state === 'loading_messages'}
                <div class="loading">
                    <i class="ti ti-loader-2" />
                    メッセージを読み込んでいます…
                </div>
            {:else}
                {#if user}
                    <div class="messages-header" class:premium={user.premium}>
                        {#if user.premium}
                            {#if tab === 'new'}
                                <button class="message-tab" on:click={() => tab = 'old'}>
                                    以前のメッセージを表示
                                    <i class="ti ti-history" />
                                </button>
                            {:else}
                                <button class="message-tab" on:click={() => tab = 'new'}>
                                    新しいメッセージを表示
                                    <i class="ti ti-bell" />
                                </button>
                            {/if}
                        {:else}
                            <button class="premium">
                                <Tooltip>
                                    <p>
                                        マシュマロのプレミアム会員に入ることで、以前のメッセージを表示できます。
                                    </p>
                                    <small>
                                        マシュマロ公式サイトからプレミアム会員に入会することができます。
                                    </small>
                                </Tooltip>
                                <i class="ti ti-history" />
                            </button>
                        {/if}
                        <button class="refresh" on:click={() => user && refreshMessages(user)}>
                            <Tooltip>読み込み直して新しいメッセージを表示する</Tooltip>
                            更新
                            <i class="ti ti-reload" />
                        </button>
                    </div>
                {/if}
                <h3>
                    メッセージ
                    <i class="ti ti-comment" />
                </h3>
                {#if tab === 'new'}
                    {#each messages as entry}
                        <MessageEntry {entry} />
                    {:else}
                        <small class="no-messages">
                            メッセージを受け取るとここに表示されます。
                        </small>
                    {/each}
                {:else}
                    <TableList table={marshmallow.recentMessages} component={MessageEntry} filter={(_, entry) => {
                        if (!('user_id' in entry)) {
                            return false;
                        }
                        return entry.user_id === $config.user;
                    }}>
                        <small class="no-messages" slot="empty">
                            メッセージを確認済みにするとここに表示されます。
                        </small>
                    </TableList>
                {/if}
            {/if}
        </div>
        <h3>
            配信に追加
            <i class="ti ti-arrow-bar-to-down" />
        </h3>
        <AssetButton {omu} {obs} dimensions={{width: 700, height: 1080}} />
        <h3>
            アカウント
            <i class="ti ti-user" />
        </h3>
        <AccountSwitcher {users} bind:user {refreshUsers} />
    </div>
    <div class="right" bind:this={container}>
        {#if $data.message}
            <MessageView {marshmallow} {user} bind:message={$data.message} />
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
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: row;
        height: 100%;
    }

    button {
        background: none;
        color: var(--color-1);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        
        &:hover {
            background: var(--color-bg-2);
            color: var(--color-1);
            transition-duration: 0.0621s;
            transition-property: background, color;
        }
    }
    
    .messages-header {
        display: flex;
        flex-direction: row;
        margin-bottom: 0.5rem;
        gap: 0.25rem;
        background: var(--color-bg-2);

        .message-tab {
            display: flex;
            align-items: center;
            justify-content: start;
            padding: 0.75rem 1rem;
            white-space: nowrap;
            flex: 1;
            border-right: 1px solid var(--color-outline);
            font-size: 0.8rem;
            font-weight: bold;

            > i {
                font-size: 1rem;
            }
        }

        .refresh {
            padding: 0.75rem 1rem;
            font-size: 0.8rem;
            font-weight: bold;
            white-space: nowrap;
            flex: 1;

            > i {
                font-size: 1rem;
            }
        }

        > .premium {
            padding: 1rem 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid var(--color-outline);
        
            &:hover {
                color: color-mix(in srgb, var(--color-text) 20%, transparent 0%);
                transition-duration: 0.0621s;
                transition-property: background, color;
            }
        }

        &.premium {
            .refresh {
                flex: 0;
            }
        }
    }

    .no-messages {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        margin: 1rem 0;
        background: var(--color-bg-2);
        color: var(--color-text);
        font-size: 0.8rem;
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem 2rem;
        border: none;
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

        > h3 {
            margin-bottom: 0.5rem;
        }
    }


    .left {
        width: 20rem;
        display: flex;
        flex-direction: column;
        margin: 1rem;
        margin-right: 0;
        gap: 0.5rem;
    }

    h3 {
        color: var(--color-1);
        font-size: 1rem;
        margin-top: 0.5rem;
    }

    .right {
        position: relative;
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
</style>
