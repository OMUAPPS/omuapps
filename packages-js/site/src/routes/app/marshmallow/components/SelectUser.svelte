<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { User } from '../marshmallow-app.js';

    export let users: Record<string, User>;
    export let user: User | null = null;
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div class="select-user" tabindex="0">
    <span class="header">
        <h3>どのユーザーを使用しますか？</h3>
        <small>あとから切り替えることもできます。</small>
    </span>
    <div class="users">
        {#each Object.entries(users) as [id, entry] (id)}
            <button on:click={() => (user = entry)}>
                <Tooltip>
                    <b>{entry.screen_name}</b>
                    <small>として続ける</small>
                </Tooltip>
                <img src={entry.image} alt={entry.name} />
                <span class="user-info">
                    <p>{entry.screen_name}</p>
                    <small>{entry.name}</small>
                </span>
            </button>
        {/each}
    </div>
    <small class="footer">
        <p>ブラウザの認証情報を使用して取得しています。</p>
        <p>認証情報は実行中のみに取得され、保存されることはありません。</p>
    </small>
</div>

<style lang="scss">
    .select-user {
        position: fixed;
        flex-direction: column;
        gap: 1rem;
        padding-top: 2rem;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: color-mix(in srgb, var(--color-bg-1) 90%, transparent 0%);
        color: var(--color-1);
    }

    .header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
        background: color-mix(in srgb, var(--color-bg-2) 75%, transparent 0%);
        padding: 1rem;

        > small {
            font-size: 0.65rem;
        }
    }

    .footer {
        margin-top: 2rem;
    }

    .users {
        display: flex;
        flex-direction: row;
        padding: 1rem;
        gap: 1rem;

        > button {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            background: var(--color-bg-2);
            border: 1px solid var(--color-outline);
            width: fit-content;
            padding: 1rem 2rem;
            cursor: pointer;
            $move: 0.2rem;
            margin-top: $move;
            margin-bottom: 0rem;

            > img {
                width: 3rem;
                height: 3rem;
                border-radius: 50%;
            }

            &:focus,
            &:hover {
                outline: 1px solid var(--color-1);
                color: var(--color-1);
                margin-top: 0rem;
                margin-bottom: $move;
                transition-duration: 0.0621s;
                transition-property: margin-top, margin-bottom;
            }
        }
    }

    .user-info {
        display: flex;
        flex-direction: column;

        > p {
            font-weight: bold;
        }

        > small {
            font-size: 0.65rem;
        }
    }
</style>
