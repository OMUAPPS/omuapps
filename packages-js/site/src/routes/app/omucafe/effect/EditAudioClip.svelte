<script lang="ts">
    import { Button } from '@omujs/ui';
    import { createADSRClip, createClip, type AudioClip } from '../asset/audioclip.js';
    import EditClip from './EditClip.svelte';

    export let clip: AudioClip;
</script>

<div>
    <Button primary disabled={clip.type === 'clip'} onclick={async () => {
        clip = await createClip({});
    }}>
        単音
    </Button>
    <Button primary disabled={clip.type === 'adsr'} onclick={async () => {
        clip = createADSRClip({});
    }}>
        ADSR
    </Button>
</div>

{#if clip.type === 'clip'}
    <EditClip bind:clip />
{:else if clip.type === 'adsr'}
    Attack
    <EditClip bind:clip={clip.sources.attack} />
    Decay
    <EditClip bind:clip={clip.sources.decay} />
    Sustain
    <EditClip bind:clip={clip.sources.sustain} />
    Release
    <EditClip bind:clip={clip.sources.release} />
{/if}
