<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { game, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('ScenePhotoMode', context);

    const { scene } = game;
</script>

<div>
</div>
<BackButton />
