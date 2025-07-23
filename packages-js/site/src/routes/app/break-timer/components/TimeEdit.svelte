<script lang="ts">
    export let value: number;

    $: days = Math.floor(value / 24 / 60 / 60);
    $: hours = Math.floor(value / 60 / 60) % 24;
    $: minutes = Math.floor(value / 60) % 60;
    $: seconds = value % 60;
    $: console.log({ days, hours, minutes, seconds });

    function update(days: number, hours: number, minutes: number, seconds: number) {
        value = Math.max(0, days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds);
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
                    value={days}
                    on:input={(event) => update(event.currentTarget.valueAsNumber, hours, minutes, seconds)}
                />
            </td>
            <td>
                <input
                    class="hours"
                    type="number"
                    min={-1}
                    max={25}
                    value={hours}
                    on:input={(event) => update(days, event.currentTarget.valueAsNumber, minutes, seconds)}
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
                        value={minutes}
                        on:input={(event) => update(days, hours, event.currentTarget.valueAsNumber, seconds)}
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
                        max={61}
                        value={seconds}
                        on:input={(event) => update(days, hours, minutes, event.currentTarget.valueAsNumber)}
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
