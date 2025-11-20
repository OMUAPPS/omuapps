<script lang="ts">
    import type { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { AssetButton, RelativeDate } from '@omujs/ui';
    import { onDestroy } from 'svelte';
    import { ASSET_APP } from './app.js';
    import type { BreakTimerApp, BreakTimerConfig } from './break-timer-app.js';
    import SceneSelect from './components/SceneSelect.svelte';
    import TimeEdit from './components/TimeEdit.svelte';
    import type { BreakTimerState } from './state.js';

    interface Props {
        omu: Omu;
        obs: OBSPlugin;
        breakTimer: BreakTimerApp;
    }

    let { omu, obs, breakTimer }: Props = $props();
    const { config, timerState } = breakTimer;

    timerState.subscribe((state) => update(state, $config));
    config.subscribe((config) => update($timerState, config));

    let task: number | null = $state(null);
    function update(newState: BreakTimerState, config: BreakTimerConfig): void {
        if (newState.type === 'break') {
            const { scene } = newState;
            if (!scene) return;
            if (task) window.clearTimeout(task);
            task = window.setTimeout(() => {
                obs.sceneSetCurrentByName(scene);
                $timerState = { type: 'work' };
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
        <input type="button" value="Start" onclick={() => breakTimer.start()} />
        <input type="text" bind:value={$config.message} />
        <input type="button" value="Reset Config" onclick={() => breakTimer.resetConfig()} />
        {#if $timerState.type === 'break' && $config.timer}
            {@const endTime = new Date($timerState.start).getTime() + $config.timer.duration * 1000}
            <RelativeDate date={new Date(endTime)} />
            <input type="datetime-local" bind:value={$timerState.start} />
        {/if}
        <SceneSelect {obs} bind:scene={$config.switch.scene} />
    </div>
    <div class="right">
        <AssetButton asset={ASSET_APP} />
        <p>
            {JSON.stringify($config)}
        </p>
        <p>
            {JSON.stringify($timerState)}
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
