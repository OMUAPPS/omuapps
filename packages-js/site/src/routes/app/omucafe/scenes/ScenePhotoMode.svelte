<script lang="ts">
    import BackButton from '../components/BackButton.svelte';
    import { type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('ScenePhotoMode', context);
</script>

<div>
</div>
<BackButton />
