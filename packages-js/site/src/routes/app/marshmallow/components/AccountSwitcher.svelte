<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { User } from '../marshmallow-app.js';
    import Account from './Account.svelte';

    export let users: Record<string, User> | null;
    export let user: User | null = null;
    export let refreshUsers: () => Promise<void>;
</script>

<button class="switcher" class:open class:switch={users && Object.keys(users).length > 1} on:click={refreshUsers}>
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

        &.open {
            padding-left: 0rem;
        }
    }
</style>
