<script lang="ts">
    import SvelteMarkdown from 'svelte-markdown';
    import agreements from '../agreements.md?raw';
    import AgreementLink from './AgreementLink.svelte';
</script>

<div class="agreements">
    <SvelteMarkdown source={agreements} renderers={{ link: AgreementLink }} />
</div>

<style lang="scss">
    .agreements {
        position: absolute;
        inset: 0;
        padding: max(4rem, 10%) max(2rem, 10%);
        overflow-y: auto;

        > :global(h1) {
            color: var(--color-1);
        }

        > :global(h2) {
            color: var(--color-1);
            margin-top: 3rem;
            margin-bottom: 1rem;
        }

        > :global(h3) {
            color: var(--color-1);
            margin-top: 2rem;
            margin-bottom: 0.5rem;
        }
    }
</style>
