<script lang="ts">
    import type { EffectSound } from './effect.js';

    export let sound: EffectSound;
</script>

<h2>動き</h2>
<div class="property">
    個数
</div>

<style lang="scss">
    h2 {
        margin-bottom: 0.5rem;
        padding-top: 1rem;
    }

    .property {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--color-bg-2);
        padding: 1rem;
        margin-top: 0.5rem;
    }
    
    .sources {
        width: 100%;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    h2 {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
    }

    .image {
        width: 5.5rem;
        height: 5.5rem;
        border: 1px solid var(--color-outline);
        background: var(--color-bg-1);
    }

    button {
        cursor: pointer;
    }
</style>
