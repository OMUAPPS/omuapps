<script lang="ts">
    import type { Progress } from '$lib/tauri';

    export let progress: Progress;

    function format(progress: Progress): number {
        const completionRatio = progress.progress / progress.total;
        if (Number.isNaN(completionRatio) || !Number.isFinite(completionRatio)) {
            return 0;
        }
        return completionRatio;
    }

</script>

<div class="bar">
    <small>{progress.msg}</small>
    <progress value={format(progress)}></progress>
</div>

<style lang="scss">
    progress {
        width: 100%;
        height: 0.5rem;
        margin-top: 0.5rem;
        accent-color: var(--color-1);
        outline: none;
        border: none;

        &::-webkit-progress-bar {
            background: var(--color-bg-1);
            border-radius: 1rem;
            border: 1px solid var(--color-outline);
        }

        &::-webkit-progress-value {
            background: var(--color-1);
            border-radius: 1rem;
        }
    }

    small {
        font-size: 0.8rem;
        word-break: break-all;
        opacity: 0.8621;
    }
</style>
