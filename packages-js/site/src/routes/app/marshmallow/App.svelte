<script lang="ts">
    import { page } from '$app/stores';
    import { DragLink, Tooltip } from '@omujs/ui';
    import AccountSwitcher from './components/AccountSwitcher.svelte';
    import MessageView from './components/MessageView.svelte';
    import SelectUser from './components/SelectUser.svelte';
    import { MarshmallowApp, type Message, type User } from './marshmallow-app.js';

    export let marshmallow: MarshmallowApp;
    const { config, data } = marshmallow;

    let user: User | null = null;
    let users: Record<string, User> | null = null;
    let state: 'loading_users' | 'user_notfound' | 'user_select' | 'loading_messages' | 'loaded' =
        'loading_users';

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

    refreshUsers();

    function createAssetUrl() {
        const url = new URL($page.url);
        url.pathname = `${url.pathname}asset`;
        url.searchParams.set('assetId', Date.now().toString());
        return url;
    }
</script>

<main>
    <div class="left">
        <AccountSwitcher {users} bind:user />
        <div class="messages">
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
                    on:click={() => ($data.message = selected ? null : item)}
                >
                    <Tooltip>
                        {#if selected}
                            クリックして選択を解除する
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
        </div>
    </div>
    <div class="right">
        {#if $data.message}
            <MessageView {marshmallow} bind:message={$data.message} />
        {:else}
            <div class="select-message">
                メッセージを選択してください。
                <small> メッセージを選択すると、メッセージを表示できます。 </small>
            </div>
        {/if}
        <small class="drag-hint">
            OBS内で使用する場合は、
            <br />
            以下のボタンからドラッグ&ドロップしてください。
        </small>
        <DragLink href={createAssetUrl}>
            <h3 slot="preview" class="drag-preview">
                これをOBSにドロップ
                <i class="ti ti-upload" />
            </h3>
            <div class="drag">
                <i class="ti ti-drag-drop" />
                ここをOBSにドラッグ&ドロップ
            </div>
        </DragLink>
    </div>
</main>
{#if state === 'loading_users'}
    <div class="loading">
        <i class="ti ti-loader-2" />
        ブラウザからユーザー情報を読み込んでいます…
        <small>これには時間がかかることがあります</small>
    </div>
{:else if state === 'loading_messages'}
    <div class="loading">
        <i class="ti ti-loader-2" />
        メッセージを読み込んでいます…
    </div>
{:else if state === 'user_notfound'}
    <div class="loading">
        <i class="ti ti-alert" />
        ユーザーの認証情報が見つかりませんでした。 ブラウザでログインしてもういちどお試しください。
        <button on:click={refreshUsers}>再読み込み</button>
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
            animation: spin 1s linear infinite;
        }
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

    .left {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 300px;
        min-width: 300px;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-2);
        border-right: 1px solid var(--color-outline);
    }

    .right {
        position: absolute;
        left: 300px;
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

    .drag-hint {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-top: 1rem;
        color: var(--color-1);
    }

    .drag-preview {
        padding: 10px 20px;
        background: var(--color-bg-2);
    }

    .drag {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 2px solid var(--color-1);
        padding: 10px;
        margin: 1rem;
        gap: 5px;
        cursor: grab;

        & > i {
            font-size: 20px;
        }

        &:hover {
            transition: 0.06233s;
        }
    }
</style>
