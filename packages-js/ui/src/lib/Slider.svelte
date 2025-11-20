<script lang="ts">
    import { run } from 'svelte/legacy';

    interface Props {
        value: number;
        min: number;
        max: number;
        step: number;
        clamp?: boolean;
        type?: 'normal' | 'percent';
        unit?: string;
        handleChange?: (value: number) => void;
        children?: import('svelte').Snippet;
    }

    let {
        value = $bindable(),
        min,
        max,
        step,
        clamp = true,
        type = 'normal',
        unit = '',
        handleChange = () => {},
        children
    }: Props = $props();

    function update(newValue: number) {
        if (step > 0) {
            newValue = round(newValue, step);
        }
        if (clamp) {
            newValue = Math.max(min, Math.min(max, newValue));
        }
        if (value == newValue) return;
        value = newValue;
        handleChange(newValue);
    }

    run(() => {
        update(value);
    });

    function isValidNumber(value: number): boolean {
        return !isNaN(value) && isFinite(value);
    }

    function setValue(newValue: number) {
        if (!isValidNumber(newValue)) {
            return;
        }
        if (step > 0) {
            newValue = round(newValue, step);
        }
        if (clamp) {
            newValue = Math.max(min, Math.min(max, newValue));
        }
        value = newValue;
        handleChange(value);
    }

    function round(value: number, precision: number): number {
        return Math.round(value / precision) * precision;
    }

    function lerp(min: number, max: number, t: number): number {
        return min + (max - min) * t;
    }

    function invLerp(min: number, max: number, value: number): number {
        return (value - min) / (max - min);
    }

    function toString(value: number): string {
        // wrap floating point number error
        // to avoid showing too many decimal places
        if (value === 0) {
            return '0';
        }
        const str = value.toString();
        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1) {
            return str;
        }
        const decimalPart = str.slice(decimalIndex + 1);
        if (decimalPart.length > 2) {
            return str.slice(0, decimalIndex + 3);
        }
        return str;
    }

    let percentValue = $derived(Math.round(invLerp(min, max, value) * 100));
</script>

<div class="setting">
    <input type="range" id="scale" {value} {min} {max} {step}
        oninput={(e) => setValue(e.currentTarget.valueAsNumber)}
        onchange={(e) => setValue(e.currentTarget.valueAsNumber)}
        onkeydown={(e) => {
            if (e.key === 'ArrowUp') {
                setValue(value + step);
            } else if (e.key === 'ArrowDown') {
                setValue(value - step);
            }
        }} />
    <span class="label">
        <label for="scale">{@render children?.()}</label>
        {#if type === 'normal'}
            <input type="number" id="scale" value={toString(value)} {min} {max} {step}
                oninput={(e) => setValue(e.currentTarget.valueAsNumber)}
                onchange={(e) => setValue(e.currentTarget.valueAsNumber)}
            />
            {#if unit}
                <span>{unit}</span>
            {/if}
        {:else if type === 'percent'}
            <input
                type="number"
                id="scale"
                value={percentValue}
                min="0"
                max="100"
                step={step * 100}
                oninput={(e) => (value = lerp(min, max, e.currentTarget.valueAsNumber / 100))}
            />
            <span>%</span>
        {/if}
    </span>
</div>

<style lang="scss">
    .setting {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        width: 10rem;

        > .label {
            width: 100%;
            display: flex;
            gap: 0.1rem;
            font-size: 0.721rem;
            align-items: baseline;

            > label {
                flex: 1;
                font-size: 0.875rem;
            }

            > span {
                font-size: 0.7rem;
            }
        }

        input[type='number'] {
            position: relative;
            appearance: none;
            height: 1rem;
            background: none;
            border: none;
            text-align: end;

            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                appearance: none;
                margin: 0;
            }

            &:hover {
                border-bottom: 1px solid var(--color-1);
            }

            &:focus {
                outline: none;
                border-bottom: 2px solid var(--color-1);
                transition: border-bottom 0.00621s;
            }
        }

        > input[type='range'] {
            position: relative;
            appearance: none;
            height: 1rem;
            width: 100%;
            background: none;
            $track-height: 0.25rem;

            &::-webkit-slider-thumb {
                appearance: none;
                width: 1rem;
                height: 1rem;
                background: var(--color-bg-2);
                border-radius: 100%;
                cursor: pointer;
                transform: translateY(calc(-50% + $track-height / 2));
                border: 2px solid var(--color-1);
                outline-width: 0px;

                &:focus-visible,
                &:active {
                    background: var(--color-1);
                    outline: 2px solid var(--color-bg-2);
                    transition:
                        background,
                        outline 0.0621s;
                }
            }

            &::-webkit-slider-runnable-track {
                width: 100%;
                height: $track-height;
                background: var(--color-1);
                border-radius: $track-height;
                cursor: pointer;
            }

            &:hover,
            &:focus-visible {
                outline: none;

                &::-webkit-slider-thumb {
                    outline: 2px solid var(--color-bg-2);
                    transition:
                        background,
                        outline 0.0621s;
                }
            }
        }
    }
</style>
