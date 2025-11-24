<script lang="ts">
    import Contributors from './_components/Contributors.svelte';
    import Licenses from './_components/Licenses.svelte';
    import Links from './_components/Links.svelte';
    import Version from './_components/Version.svelte';
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
