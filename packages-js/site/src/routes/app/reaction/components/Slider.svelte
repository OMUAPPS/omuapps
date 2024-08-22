<script lang="ts">
    import { invLerp, lerp } from '$lib/math/math.js';

    export let value: number;
    export let min: number;
    export let max: number;
    export let step: number;
    export let type: 'normal' | 'percent' = 'normal';
    $: percentValue = Math.round(invLerp(min, max, value) * 100);
</script>

<div class="setting">
    <span class="label">
        <label for="scale"><slot /></label>
        {#if type === 'normal'}
            <input type="number" id="scale" bind:value {min} {max} {step} />
        {:else if type === 'percent'}
            <input
                type="number"
                id="scale"
                bind:value={percentValue}
                min="0"
                max="100"
                step={step * 100}
                on:input={() => (value = lerp(min, max, percentValue / 100))}
            />
            <span>%</span>
        {/if}
    </span>
    <input type="range" id="scale" bind:value {min} {max} {step} />
</div>

<style lang="scss">
    .setting {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        justify-content: space-between;
        width: 10rem;

        > .label {
            width: 100%;
            display: flex;
            gap: 0.1rem;
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
            height: 1.5rem;
            background: none;
            border: none;
            text-align: end;

            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                appearance: none;
                margin: 0;
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
            &:focus {
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
