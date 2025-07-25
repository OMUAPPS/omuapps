<script lang="ts">
    import { getGame } from '../omucafe-app.js';
    import DebugValue from './DebugValue.svelte';

    const { globals: { debug } } = getGame();    
    const { count, logs } = debug;
</script>

<ol class="logs omu-scroll">
    {#key $count}
        {#each logs as log, index (index)}
            <li>
                <DebugValue value={log} />
            </li>
        {/each}
    {/key}
</ol>

<style lang="scss">
    .logs {
        display: flex;
        flex-direction: column;
        font-family: monospace;
        font-size: 1rem;
        line-height: 1.75rem;
        padding: 0 2rem;
        background: var(--color-bg-2);
        height: 16rem;
        overflow-y: auto;
    }
</style>
