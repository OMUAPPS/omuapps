<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { User } from '../marshmallow-app.js';
    import Account from './Account.svelte';

    export let users: Record<string, User> | null;
    export let user: User | null = null;
    export let refreshUsers: () => Promise<void>;
    let open = false;
</script>

<button class="switcher" class:switch={users && Object.keys(users).length > 1} on:click={async () => {
    if (!open) {
        await refreshUsers();
    }
    open = !open;
}}>
    {#if user}
        <Account {user} />
    {/if}
    {#if users && Object.keys(users).length > 1}
        <Tooltip>
            {#if user}
                <b>{user.screen_name}</b> <small>にログインしています</small>
            {:else}
                ログインしていません
            {/if}
            <br />
            アカウントを切り替える
        </Tooltip>
        <div class="popup" class:open>
            {#if users}
                {#each Object.entries(users) as [id, entry] (id)}
                    {@const selected = user === entry}
                    <button
                        on:click={() => {
                            user = entry;
                            close();
                        }}
                        class="user"
                        class:selected
                    >
                        <Tooltip>
                            {entry.screen_name} にログイン
                        </Tooltip>
                        <img src={entry.image} alt={entry.name} />
                        <span class="user-info">
                            <p>{entry.screen_name}</p>
                            <small>{entry.name}</small>
                        </span>
                        {#if selected}
                            <i class="ti ti-check" />
                        {/if}
                    </button>
                {/each}
            {:else}
                <p>他のアカウントは見つかりませんでした</p>
            {/if}
        </div>
        <i class="ti ti-chevron-down" />
    {:else}
        <Tooltip>
            {#if user}
                <b>{user.screen_name}</b> <small>にログインしています</small>
            {:else}
                ログインしていません
            {/if}
        </Tooltip>
    {/if}
</button>

<style lang="scss">
    .switcher {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        background: var(--color-bg-2);

        > :not(.popup) {
            pointer-events: none;
        }

        > i {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            margin-right: 1.25rem;
            width: 2rem;
            height: 2rem;
        }

        &.switch {
            &:focus,
            &:hover {
                background: var(--color-bg-1);
                color: var(--color-1);
                padding-left: 0.25rem;
                transition-duration: 0.0621s;
                transition-property: padding-left, background, color;
            }
        }

        &:focus {
            outline: none;
        }
    }

    .popup {
        position: absolute;
        z-index: 200;
        top: 100%;
        margin: 0.25rem 1rem;
        display: none;
        min-width: 200px;
        outline: 1px solid var(--color-outline);

        &.open {
            display: block;
        }

        &::before {
            content: '';
            position: absolute;
            top: -1rem;
            left: 50%;
            transform: translateX(-50%);
            border: 0.5rem solid transparent;
            border-bottom-color: var(--color-outline);
        }
    }

    .user {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        gap: 1rem;
        padding: 0.6rem 1rem;
        width: 100%;
        background: var(--color-bg-2);
        border: none;
        cursor: pointer;

        > img {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
        }

        > .user-info {
            display: flex;
            flex-direction: column;
            align-items: start;

            > p {
                font-weight: bold;
                font-size: 0.8rem;
            }

            > small {
                font-size: 0.6rem;
            }
        }

        &.selected {
            background: var(--color-1);
            color: var(--color-bg-2);
        }

        &:focus,
        &:hover {
            padding-left: 1.2rem;
            padding-right: 0.8rem;
            transition-duration: 0.0621s;
            transition-property: padding-left, padding-right, background, color;
        }

        &:active {
            padding-left: 0.8rem;
            padding-right: 1.2rem;
            transition-duration: 0.0621s;
            transition-property: padding-left, padding-right, background, color;
        }
    }
</style>
