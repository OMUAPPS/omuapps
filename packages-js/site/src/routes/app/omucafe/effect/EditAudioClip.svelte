<script lang="ts">
    import { Checkbox, Slider } from '@omujs/ui';
    import { createClip, createEnvelopeClip, createFilter, type AudioClip } from '../asset/audioclip.js';
    import EditClip from './EditClip.svelte';

    export let clip: AudioClip | null;
</script>

<div class="actions">
    <button disabled={!clip} on:click={async () => {
        clip = null;
    }}>
        無し
    </button>
    <button disabled={clip?.type === 'clip'} on:click={async () => {
        clip = await createClip({});
    }}>
        単音
    </button>
    <button disabled={clip?.type === 'envelope'} on:click={async () => {
        clip = createEnvelopeClip({});
    }}>
        Envelope
    </button>
    <button disabled={clip?.type === 'filter'} on:click={async () => {
        clip = createFilter({
            clip: await createClip({}),
        });
    }}>
        効果
    </button>
</div>

{#if !clip}
    .
{:else if clip.type === 'clip'}
    <EditClip bind:clip />
{:else if clip.type === 'envelope'}
    Attack
    <svelte:self bind:clip={clip.sources.attack} />
    Sustain
    <svelte:self bind:clip={clip.sources.sustain} />
    Release
    <svelte:self bind:clip={clip.sources.release} />
{:else if clip.type === 'filter'}
    効果
    <Checkbox value={!!clip.attack} handle={(value) => {
        if (clip?.type !== 'filter') return;
        clip.attack = value ? 100 : undefined;
    }} />
    {#if clip.attack}
        <Slider bind:value={clip.attack} min={0} max={1000} step={1} unit="ms" clamp={false} />
    {/if}

    <Checkbox value={!!clip.release} handle={(value) => {
        if (clip?.type !== 'filter') return;
        clip.release = value ? 100 : undefined;
    }} />
    {#if clip.release}
        <Slider bind:value={clip.release} min={0} max={1000} step={1} unit="ms" clamp={false} />
    {/if}
    <svelte:self bind:clip={clip.clip} />
{/if}

<style lang="scss">
    .actions {
        display: flex;

        > button {
            flex: 1;
            border: none;
            padding: 0.5rem 0;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--color-1);
            background: var(--color-bg-2);
            border: 0.25rem solid var(--color-bg-2);
            border-radius: 2px;

            &:hover {
                outline: 1px solid var(--color-1);
                outline-offset: -0.25rem;
            }

            &:disabled {
                background: var(--color-1);
                color: var(--color-bg-2);
            }
        }
    }
</style>
