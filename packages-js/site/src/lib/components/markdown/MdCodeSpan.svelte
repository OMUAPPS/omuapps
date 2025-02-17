<script lang="ts">
    // export let raw: string;
    export let text: string;
</script>

<span>
    {text}
</span>

<style lang="scss">
    span {
        display: inline;
        background-color: var(--color-bg-1);
        color: var(--color-1);
        padding: 0.25rem 0.5rem;
        margin: 0 0.5rem;
        font-size: 0.9rem;
        font-weight: 600;
        font-family: var(--font-mono);
        width: 100%;
        text-wrap: nowrap;
    }
</style>
