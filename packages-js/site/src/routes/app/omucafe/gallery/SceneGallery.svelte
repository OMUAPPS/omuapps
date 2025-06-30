<script lang="ts">
    import { TableList } from '@omujs/ui';
    import BackButton from '../components/BackButton.svelte';
    import { getGame } from '../omucafe-app.js';
    import type { SceneContext } from '../scenes/scene.js';
    import GalleryEntry from './GalleryEntry.svelte';

    export let context: SceneContext;
    
    const { scene, gallery } = getGame();
</script>

{#if $scene.type === 'gallery'}
    <main>
        <div class="items">
            <TableList table={gallery} component={GalleryEntry} />
        </div>
    </main>
{/if}
<BackButton to={{
    type: 'main_menu',
}} active={context.active}/>

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
