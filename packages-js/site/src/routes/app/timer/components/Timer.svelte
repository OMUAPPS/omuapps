<script lang="ts">

    import { BROWSER } from 'esm-env';
    import { TimerApp } from '../timer-app.js';

    interface Props {
        timer: TimerApp;
    }

    let { timer }: Props = $props();
    const { data, config } = timer;

    const PARAM_REGEX = /\{([\w]+)\}/g;

    let timerId: number;
    let time = $state(0);
    let displayTime = $derived(updateDisplayTime(time));
    let running = false;

    function updateTime() {
        if (running) {
            time = Date.now() - $data.startTime + $data.time;
            displayTime = updateDisplayTime(time);
            timerId = requestAnimationFrame(updateTime);
        } else {
            time = $data.time;
            cancelAnimationFrame(timerId);
        }
    }

    function updateDisplayTime(time: number) {
        const times = {
            minutes: Math.floor(time / 1000 / 60)
                .toString()
                .padStart(1, '0'),
            seconds: Math.floor((time / 1000) % 60)
                .toString()
                .padStart(2, '0'),
            centiseconds: Math.floor((time / 10) % 100)
                .toString()
                .padStart(2, '0'),
        };

        return $config.format.replace(
            PARAM_REGEX,
            (match, key: keyof typeof times) => times[key],
        );
    }

    let background = $derived(`${$config.style.backgroundColor}${Math.floor(
        $config.style.backgroundOpacity * 255,
    ).toString(16)}`);

    if (BROWSER) {
        data.subscribe((value) => {
            running = value.running;
            updateTime();
        });
    }
</script>

<h1
    style:color={$config.style.color}
    style:background
    style:padding="{$config.style.backgroundPadding[0]}px {$config.style.backgroundPadding[1]}px"
    style:font-size="{$config.style.fontSize}px"
    style:font-family={$config.style.fontFamily}
>
    {displayTime}
</h1>
