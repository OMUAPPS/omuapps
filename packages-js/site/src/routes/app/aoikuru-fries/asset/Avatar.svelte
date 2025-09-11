<script lang="ts">
    import type { Writable } from 'svelte/store';
    import { frame, type State } from '../state.js';
    import catching from './img/catching.png';
    import eating1 from './img/eating1.png';
    import eating2 from './img/eating2.png';
    import idle1 from './img/idle1.png';
    import idle2 from './img/idle2.png';
    import idle_start from './img/idle_start.png';
    import throw_many from './img/throw_many.png';
    import throw_many_hit from './img/throw_many_hit.png';
    import throwing from './img/throwing.png';

    export let state: Writable<State>;

    const idleFrames = [
        { src: idle1, frame: 250 * 0 },
        { src: idle2, frame: 250 * 1 },
        { src: idle1, frame: 250 * 2 },
        { src: idle2, frame: 250 * 3 },
        { src: idle1, frame: 250 * 4 },
    ];
    const idleDuration = idleFrames.reduce((acc, v) => acc + v.frame, 0);
    const FRAME = 1000 / 28;

    function getImage(time: number): string {
        if ($state.type === 'catching') {
            const elapsed = time - $state.start;
            const frames = elapsed / FRAME / 18;
            // throw_start
            if (frames < 1) {
                return throwing;
            }
            // throwing
            if (frames < 2) {
                return throwing;
            }
            // catching
            if (frames < 3) {
                return catching;
            }
            // eating
            if (frames < 8) {
                if (Math.floor(frames) % 2 === 0) {
                    return eating1;
                } else {
                    return eating2;
                }
            }
            // idle
            $state = { type: 'idle', start: performance.timeOrigin + performance.now() };
        }
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

<img src={getImage($frame)} alt="" />
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
