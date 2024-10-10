<script lang="ts">
    export let active = true;
</script>

<i class="ti ti-loader-2" class:active />

<style lang="scss">
    i {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-1);
        visibility: hidden;
        background: transparent;
        border: none;
        animation: spin 1s linear infinite;
        width: 1rem;
        height: 1rem;

        &.active {
            visibility: visible;
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
</style>
