<script lang="ts">
    import { beforeNavigate } from '$app/navigation';
    
    let loading = false;
    let loaded = true;
    let timeout: number;

    beforeNavigate((nav) => {
        if (nav.to?.route.id) {
            loading = true;
            loaded = false;
            nav.complete.catch().finally(() => markLoaded());
        }
    });


    function markLoaded() {
        if (timeout) {
            window.clearTimeout(timeout);
        }
        loaded = true;
        timeout = window.setTimeout(() => {
            loading = false;
        }, 162.1);
    }
</script>

{#if loading}
    <div class="progress-bar">
        <div class="progress" class:loading class:loaded></div>
    </div>
{/if}

<style lang="scss">
    .progress-bar {
        position: fixed;
        inset: 2px;
        height: 1px;
        z-index: 1000;
    }

    .progress {
        height: 100%;
        background: linear-gradient(to right, transparent 0%, var(--color-1) 100%);
        width: 100%;
        opacity: 0;

        &.loaded {
            animation: fadeOut 0.01621s linear;
            opacity: 0;
        }

        &.loading {
            animation: progress 0.621s linear;
            opacity: 1;
        }
    }

    @keyframes progress {
        0% {
            width: 0;
        }

        50% {
            width: 90%;
        }

        100% {
            width: 100%;
        }
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
            width: 100%;
        }
    }
</style>
