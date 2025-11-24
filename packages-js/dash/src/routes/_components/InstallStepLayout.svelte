<script lang="ts">
    import { keepOpenOnBackground } from '$lib/main/settings';
    import { backgroundRequested } from '$lib/tauri';
    import { Checkbox } from '@omujs/ui';

</script>

<div class="content">
    <div class="main">
        <slot />
    </div>
    <div class="hint">
        <slot name="hint" />
    </div>
    <div class="notification">
        {#if $backgroundRequested}
            起動後にこのウィンドウは閉じられます
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>
                開いたままにする
                <Checkbox bind:value={$keepOpenOnBackground} />
            </label>
        {/if}
    </div>
</div>

<style lang="scss">
    .content {
        position: absolute;
        inset: 0;
        display: flex;
        background: var(--color-bg-1);
    }

    $padding-vertically: max(8rem, 12%);

    .notification {
        position: absolute;
        right: 0;
        top: 0;
        margin: 2rem;
        display: flex;
        flex-direction: column;
        border-bottom: 2px solid var(--color-1);
        color: var(--color-1);

        > label {
            display: flex;
            align-items: center;
            color: var(--color-text);
            font-size: 0.8rem;
        }
    }

    .main {
        position: relative;
        width: 24rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        padding: $padding-vertically 2rem;
        padding-bottom: 15%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .hint {
        position: relative;
        padding: $padding-vertically 2rem;
        padding-bottom: 15%;
        display: flex;
        flex: 1;
        justify-content: flex-start;
    }
</style>
