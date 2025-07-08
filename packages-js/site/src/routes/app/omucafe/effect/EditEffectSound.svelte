<script lang="ts">
    import EditClip from './EditAudioClip.svelte';
    import type { EffectSound } from './effect.js';

    export let sound: EffectSound;
</script>

<EditClip bind:clip={sound.clip}/>
