<script lang="ts">
    import { getGame } from '../omucafe-app.js';

    const { states } = getGame();
</script>

<div class="info">
    {#if $states.kitchen.order}
        {@const { order } = $states.kitchen}
        <div class="order">
            {#if order.user.avatar}
                <img class="avatar" src={order.user.avatar} alt="">
            {/if}
            {order.user.name}
        </div>
    {/if}
</div>

<style lang="scss">
    .info {
        position: absolute;
        bottom: 12rem;
        right: 8rem;
    }
    
    .order {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        padding: 0.5rem;
        padding-right: 1rem;
    }

    .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 100%;
    }
</style>
