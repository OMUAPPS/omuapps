<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('ScenePhotoMode', context);

    const { scene } = getGame();
</script>

<div>
</div>
<BackButton />
