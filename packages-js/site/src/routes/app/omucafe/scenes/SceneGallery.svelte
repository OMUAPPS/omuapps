<script lang="ts">
    import { TableList } from '@omujs/ui';
    import BackButton from '../components/BackButton.svelte';
    import GalleryEntry from '../components/GalleryEntry.svelte';
    import { getGame, type SceneContext } from '../omucafe-app.js';

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
