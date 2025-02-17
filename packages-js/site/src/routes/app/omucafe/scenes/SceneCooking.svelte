<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneCooking', context);
</script>

<main>
</main>
<BackButton />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
    }
</style>
