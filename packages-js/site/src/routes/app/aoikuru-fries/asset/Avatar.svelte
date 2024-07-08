<script lang="ts">
    import type { Writable } from 'svelte/store';
    import { frame, type State, type StateType } from '../state.js';
    import idle1 from './img/idle1.png';
    import idle2 from './img/idle2.png';
    import throwing from './img/throwing.png';
    import catching from './img/catching.png';
    import eating1 from './img/eating1.png';
    import eating2 from './img/eating2.png';
    import idle_start from './img/idle_start.png';
    import throw_many from './img/throw_many.png';
    import throw_many_hit from './img/throw_many_hit.png';

    export let state: Writable<State>;

    const images = {
        idle: idle1,
        throw_start: throwing,
        throwing,
        catching,
        eating: eating1,
        throw_many,
        throw_many_hit,
        idle_start,
    } satisfies Record<StateType, string>;

    $: {
        if ($state.type === 'catching') {
            setTimeout(() => {
                $state.type = 'eating';
            }, 14 * 33.3);
        }
        if ($state.type === 'eating') {
            setTimeout(() => {
                $state = { type: 'idle_start' };
            }, 88 * 33.3);
        }
        if ($state.type === 'idle_start') {
            setTimeout(() => {
                $state = { type: 'idle' };
            }, 18 * 33.3);
        }
        if ($state.type === 'throw_start') {
            $state = {
                ...$state,
                type: 'throwing',
            };
            setTimeout(() => {
                if ($state.type === 'throwing') {
                    $state = {
                        ...$state,
                        type: 'catching',
                    };
                }
            }, 14 * 33.3);
        }
        if ($state.type === 'throw_many') {
            setTimeout(() => {
                if ($state.type === 'throw_many') {
                    $state = {
                        ...$state,
                        type: 'throw_many_hit',
                    };
                }
            }, 90);
        }
        if ($state.type === 'throw_many_hit') {
            setTimeout(() => {
                if ($state.type === 'throw_many_hit') {
                    $state = {
                        ...$state,
                        type: 'idle_start',
                    };
                }
            }, 1000);
        }
    }

    let eatTime = 0;
    let idleTime = 0;

    const idleFrames = [
        { src: idle1, frame: 250 * 0 },
        { src: idle2, frame: 250 * 1 },
        { src: idle1, frame: 250 * 2 },
        { src: idle2, frame: 250 * 3 },
        { src: idle1, frame: 250 * 4 },
    ];
    const idleDuration = idleFrames.reduce((acc, v) => acc + v.frame, 0);

    function getIdleFrame(frame: number) {
        let time = (idleTime += frame);
        let f = time % idleDuration;
        for (const { src, frame: f2 } of idleFrames) {
            if (f < f2) {
                return src;
            }
            f -= f2;
        }
        return idle1;
    }
</script>

{#if $state.type === 'eating'}
    {#if Math.floor((eatTime += $frame) / 250 / 2) % 2 === 0}
        <img src={eating1} alt="" />
    {:else}
        <img src={eating2} alt="" />
    {/if}
{:else if $state.type === 'idle'}
    <img src={getIdleFrame($frame)} alt="" />
{:else}
    <img src={images[$state.type]} alt="" />
{/if}
<div class="preloader">
    <img src={idle1} alt="" />
    <img src={idle2} alt="" />
    <img src={throwing} alt="" />
    <img src={catching} alt="" />
    <img src={eating1} alt="" />
    <img src={eating2} alt="" />
    <img src={idle_start} alt="" />
    <img src={throw_many} alt="" />
    <img src={throw_many_hit} alt="" />
</div>

<style lang="scss">
    img {
        position: fixed;
        left: 0px;
        top: 0px;
    }

    .preloader {
        display: none;
    }
</style>
