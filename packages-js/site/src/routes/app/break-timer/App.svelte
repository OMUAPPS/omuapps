<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import type { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { RelativeDate } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import type { BreakTimerApp, BreakTimerConfig } from './break-timer-app.js';
    import SceneSelect from './components/SceneSelect.svelte';
    import TimeEdit from './components/TimeEdit.svelte';
    import type { BreakTimerState } from './state.js';

    export let omu: Omu;
    export let obs: OBSPlugin;
    export let breakTimer: BreakTimerApp;
    const { config, state } = breakTimer;

    state.subscribe((state) => update(state, $config));
    config.subscribe((config) => update($state, config));

    let task: number | null = null;
    function update(newState: BreakTimerState, config: BreakTimerConfig): void {
        if (newState.type === 'break') {
            const { scene } = newState;
            if (!scene) return;
            if (task) window.clearTimeout(task);
            task = window.setTimeout(() => {
                obs.sceneSetCurrentByName(scene);
                $state = { type: 'work' };
            }, config.timer.duration * 1000);
            console.log('set timeout', task, config.timer.duration);
        }
    }

    onDestroy(() => {
        if (task) clearTimeout(task);
    });
</script>

<main>
    <div class="left">
        {task}
        {#if $config.timer}
            <TimeEdit bind:value={$config.timer.duration} />
        {/if}
        <input type="button" value="Start" on:click={() => breakTimer.start()} />
        <input type="text" bind:value={$config.message} />
        <input type="button" value="Reset Config" on:click={() => breakTimer.resetConfig()} />
        {#if $state.type === 'break' && $config.timer}
            {@const endTime = new Date($state.start).getTime() + $config.timer.duration * 1000}
            <RelativeDate date={new Date(endTime)} />
            <input type="datetime-local" bind:value={$state.start} />
        {/if}
        <SceneSelect {obs} bind:scene={$config.switch.scene} />
    </div>
    <div class="right">
        <AssetButton {omu} {obs} />
        <p>
            {JSON.stringify($config)}
        </p>
        <p>
            {JSON.stringify($state)}
        </p>
    </div>
</main>

<style lang="scss">
    $left-width: 300px;

    main {
        position: relative;
        display: flex;
        flex-direction: row;
        height: 100%;
    }

    .left {
        width: $left-width;
        padding: 10px;
        border-right: 1px solid #ccc;
    }

    .right {
        flex: 1;
        padding: 10px;
    }
</style>
