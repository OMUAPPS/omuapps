<script lang="ts">
    import { linkOpenHandler } from './stores';
    export let href: string;
    export let primary = false;
</script>

<a {href} target="_blank" rel="noopener noreferrer" class:primary on:click={(event) => {
    if (!$linkOpenHandler) return;
    const prevent = $linkOpenHandler(href);
    if (!prevent) return;
    event.preventDefault();
}}>
    <slot />
</a>

<style lang="scss">
    a {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 2rem;
        width: 2rem;
        font-size: 1rem;
        color: var(--color-1);
        background: transparent;
        border: none;
        border-radius: 2px;
        outline: none;
        outline-offset: -1px;
        text-decoration: none;

        &:active,
        &:hover {
            color: var(--color-bg-2);
            background: var(--color-1);
            outline: 1px solid var(--color-1);
        }

        &:focus-visible {
            outline: 2px solid var(--color-1);
            outline-offset: 1px;
        }
    }

    .primary {
        background: var(--color-1);
        color: var(--color-bg-1);

        &:active,
        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
        }
    }
</style>
