<script lang="ts">
    import EditClip from './EditAudioClip.svelte';
    import type { EffectSound } from './effect-state.js';

    interface Props {
        sound: EffectSound;
    }

    let { sound = $bindable() }: Props = $props();
</script>

<EditClip bind:clip={sound.clip} />
