<script lang="ts">
    import type { Spawner } from '../../game/behavior/spawner.js';
    import { getGame } from '../../omucafe-app.js';
    
    export let spawner: Spawner;

    const { gameConfig: config } = getGame();
</script>

<div class="behavior">
    <select bind:value={spawner.spawnItemId}>
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
