<script lang="ts">
    import { TableList } from '@omujs/ui';
    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import GalleryEntry from './GalleryEntry.svelte';

    interface Props {
        context: SceneContext;
    }

    let { context }: Props = $props();

    const { scene, gallery } = getGame();
</script>

{#if $scene.type === 'gallery'}
    <main>
        <div class="items">
            <TableList table={gallery} reverse>
                {#snippet component({ entry })}
                    <GalleryEntry {entry} />
                {/snippet}
            </TableList>
        </div>
    </main>
{/if}
<BackButton to={{
    type: 'main_menu',
}} active={context.active} />

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        background: color-mix(in srgb, var(--color-bg-1) 98%, transparent 0%);
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        padding: 5% 3%;
    }

    .items {
        height: 100%;
    }
</style>
