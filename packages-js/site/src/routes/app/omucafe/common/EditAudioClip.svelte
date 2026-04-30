<script lang="ts">
    import { Button, FileDrop } from '@omujs/ui';
    import type { AudioClip } from '../audio';
    import { Game } from '../core/game';

    interface Props {
        clip: AudioClip | undefined;
    }

    let {
        clip = $bindable(),
    }: Props = $props();

    const game = Game.getInstance();
</script>

{#if !clip}
    <FileDrop accept="audio/*" handle={async (files) => {
        if (files.length > 1) {
            const clips: AudioClip[] = [];
            for (const file of files) {
                clips.push({
                    type: 'single',
                    asset: await game.asset.uploadFile(file),
                    start: 0,
                    duration: 10,
                });
            }
            clip = {
                type: 'random',
                clips,
            };
        } else {
            clip = {
                type: 'single',
                asset: await game.asset.uploadFile(files[0]),
                start: 0,
                duration: 10,
            };
        }
    }} primary multiple>
        変更する
    </FileDrop>
{:else}
    {@render drawClip(clip, () => {
        clip = undefined;
    })}
{/if}
{#snippet drawClip(segment: AudioClip, remove: () => void)}
    {#if segment.type === 'single'}
        {@const audio = game.asset.getUrl(segment.asset)}
        <div class="edit">
            <span>
                <Button onclick={remove} primary>
                    削除
                </Button>
            </span>
            {#await audio?.promise then audio}
                {#if audio?.type === 'ready'}
                    <audio controls src={audio.data}></audio>
                {/if}
            {/await}
        </div>
    {:else if segment.type === 'random'}
        {#each segment.clips as single, index (index)}
            {@render drawClip(single, () => {
                segment.clips.splice(index, 1);
                segment.clips = [...segment.clips];
                if (segment.clips.length === 0) {
                    clip = undefined;
                }
            })}
        {/each}
        <FileDrop accept="audio/*" handle={async (files) => {
            if (files.length > 0) {
                const file = files[0];
                segment.clips.push({
                    type: 'single',
                    asset: await game.asset.uploadFile(file),
                    start: 0,
                    duration: 10,
                });
                segment.clips = [...segment.clips];
            }
        }} primary multiple>
            追加する
        </FileDrop>
    {/if}
{/snippet}

<style lang="scss">
    .edit {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
</style>
