<script lang="ts">
    import type { BreakTimerApp } from './break-timer-app.js';
    import TimeEdit from './components/TimeEdit.svelte';

    export let breakTimer: BreakTimerApp;
    const { config, state } = breakTimer;
</script>

<main>
    <div class="left">
        {#if $config.timer}
            <TimeEdit bind:value={$config.timer.duration} />
        {/if}
    </div>
    <div>
        <p>
            {JSON.stringify($config)}
        </p>
        <p>
            {JSON.stringify($state)}
        </p>
    </div>
</main>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: row;
        height: 100%;
    }
</style>
