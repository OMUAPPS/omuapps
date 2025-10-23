<script lang="ts">
    import type { Update } from '@tauri-apps/plugin-updater';
    import SvelteMarkdown from 'svelte-markdown';

    export let update: Update;
</script>

<div class="hint">
    <SvelteMarkdown source={update.body} />
</div>

<style lang="scss">
    .hint {
        position: absolute;
        inset: 0;
        padding: 20% 20%;
        padding-top: max(8rem, 12%);
        overflow-y: auto;
        height: 100%;

        > :global(h1) {
            margin-bottom: 1rem;
        }

        > :global(h2) {
            margin-top: 1.5rem;
            margin-bottom: 1rem;
        }

        > :global(h3) {
            margin-top: 1rem;
            margin-bottom: 0.5rem;
        }

        > :global(ul) {
            margin-top: 1rem;
            margin-bottom: 1rem;
        }
    }

    h2 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
    }
</style>
