<script lang="ts">
</script>

<div class="menu omu-scroll">
    <slot />
</div>

<style lang="scss">
    .menu {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 22rem;
        overflow-y: auto;

        > :global(h3) {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }

        > :global(:first-child) {
            margin-top: 0;
        }
    }
</style>
