<script lang="ts">
    import Contributors from './Contributors.svelte';
    import Licenses from './Licenses.svelte';
    import Links from './Links.svelte';
    import Version from './Version.svelte';
</script>

<main>
    <Version />
    <Links />
    <Contributors />
    <Licenses />
</main>

<style>
    main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3rem;
    }
</style>
