<script lang="ts">
    import type { User } from '../marshmallow-app.js';

    export let user: User;
</script>

<div class="account">
    <img src={user.image} alt={user.name} />
    <span class="user-info">
        <p>{user.screen_name}</p>
        <small>{user.name}</small>
    </span>
</div>

<style lang="scss">
    .account {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        padding-right: 1rem;
        width: 100%;

        > * {
            pointer-events: none;
        }

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
            }

            > small {
                font-size: 0.65rem;
            }
        }
    }
</style>
