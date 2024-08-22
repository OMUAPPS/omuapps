<script lang="ts">
    import { BROWSER } from 'esm-env';
    import { TimerApp } from '../timer-app.js';

    export let timer: TimerApp;
    const { data, config } = timer;

    let timerId: number;
    let time = 0;
    let displayTime = '';

    function updateTime() {
        if (!$data.running) {
            return;
        }
        time = Date.now() - $data.startTime + $data.time;
        timerId = requestAnimationFrame(updateTime);
    }

    function update() {
        if ($data.running) {
            updateTime();
        } else {
            time = $data.time;
            cancelAnimationFrame(timerId);
        }
    }

    const paramRegex = /\{([\w]+)\}/g;

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

        displayTime = $config.format.replace(paramRegex, (match, key: keyof typeof times) => times[key]);
    }

    $: updateDisplayTime(time);
    $: background = `${$config.style.backgroundColor}${Math.floor(
        $config.style.backgroundOpacity * 255,
    ).toString(16)}`;

    if (BROWSER) {
        data.subscribe(update);
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
