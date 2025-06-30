<script lang="ts">
    import { getGame } from '../../omucafe-app.js';
    import type { Spawner } from './spawner.js';
    
    export let behavior: Spawner;

    const { gameConfig: config } = getGame();
</script>

<div class="behavior">
    <select bind:value={behavior.spawnItemId}>
        {#each Object.entries($config.items) as [id, item] (id)}
            <option value={id}>{item.name}</option>
        {/each}
    </select>
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
</style>
