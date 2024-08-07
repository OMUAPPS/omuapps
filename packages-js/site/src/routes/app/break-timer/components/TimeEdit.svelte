<script lang="ts">
    export let value: number;

    $: days = Math.floor(value / 24 / 60 / 60);
    $: hours = Math.floor(value / 60 / 60) % 24;
    $: minutes = Math.floor(value / 60) % 60;
    $: seconds = value % 60;

    function update() {
        value = Math.max(0, days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds);
        days = clamp0(days);
        hours = clamp0(hours);
        minutes = clamp0(minutes);
        seconds = clamp0(seconds);
    }

    function clamp0(value: number) {
        return Math.max(0, value);
    }
</script>

<table>
    <thead>
        <tr>
            <th>日</th>
            <th>時間</th>
            <th>分</th>
            <th>秒</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <input
                    class="days"
                    type="number"
                    min={-1}
                    max={100}
                    bind:value={days}
                    on:input={update}
                />
            </td>
            <td>
                <input
                    class="hours"
                    type="number"
                    min={-1}
                    max={25}
                    bind:value={hours}
                    on:input={update}
                />
            </td>
            <td>
                <span>
                    :
                    <input
                        class="minutes"
                        type="number"
                        min={-1}
                        max={61}
                        bind:value={minutes}
                        on:input={update}
                    />
                </span>
            </td>
            <td>
                <span>
                    :
                    <input
                        class="seconds"
                        type="number"
                        min={-1}
                        max={60}
                        bind:value={seconds}
                        on:input={update}
                    />
                </span>
            </td>
        </tr>
    </tbody>
</table>

<style lang="scss">
    table {
        width: 100%;
    }

    th {
        text-align: left;
    }

    input {
        width: 100%;
        border: none;
        background: transparent;
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-1);
    }

    span {
        display: flex;
        align-items: center;
    }

    .hours,
    .minutes,
    .seconds {
        width: 2.5rem;
    }

    .days {
        margin-right: 0.5rem;
        width: 2.5rem;
    }
</style>
