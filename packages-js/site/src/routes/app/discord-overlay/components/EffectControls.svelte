<script lang="ts">
    import { Slider, Tooltip } from '@omujs/ui';
    import type { Config } from '../discord-overlay-app.js';

    interface Props {
        effects: Config['effects'];
    }

    let { effects = $bindable() }: Props = $props();

    let selectedEffectType: 'speech' | 'shadow' | null = $state(null);
    let shadowColorElement: HTMLInputElement | null = $state(null);

    function rgbToHex(r: number, g: number, b: number): string {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
</script>

<span>
    <button onclick={() => { effects.speech.active = !effects.speech.active; }} class:active={effects.speech.active} class="effect">
        <i class="ti ti-brightness"></i>
        明るさを調整
    </button>
    <button class="option" onclick={() => {
        selectedEffectType = selectedEffectType === 'speech' ? null : 'speech';
    }}>
        {#if selectedEffectType === 'speech'}
            <Tooltip>
                設定を閉じる
            </Tooltip>
            <i class="ti ti-chevron-up"></i>
        {:else}
            <Tooltip>
                設定を開く
            </Tooltip>
            <i class="ti ti-chevron-down"></i>
        {/if}
    </button>
</span>
{#if selectedEffectType === 'speech'}
    <div class="options">
        <small>喋ってる時の明るさ</small>
        <span>
            <Slider min={0} max={1} step={0.01} bind:value={effects.speech.intensity.speaking} />
        </span>
        <small>喋ってない時の明るさ</small>
        <span>
            <Slider min={0} max={1} step={0.01} bind:value={effects.speech.intensity.inactive} />
        </span>
        <small>ミュート時の明るさ</small>
        <span>
            <Slider min={0} max={1} step={0.01} bind:value={effects.speech.intensity.muted} />
        </span>
        <small>聞こえない時の明るさ</small>
        <span>
            <Slider min={0} max={1} step={0.01} bind:value={effects.speech.intensity.deafened} />
        </span>
    </div>
{/if}
<span>
    <button onclick={() => {
        effects.shadow.active = !effects.shadow.active;
    }} class:active={effects.shadow.active} class="effect">
        <i class="ti ti-square-half"></i>
        影
    </button>
    <button class="option" onclick={() => {
        selectedEffectType = selectedEffectType === 'shadow' ? null : 'shadow';
    }}>
        {#if selectedEffectType === 'shadow'}
            <Tooltip>
                設定を閉じる
            </Tooltip>
            <i class="ti ti-chevron-up"></i>
        {:else}
            <Tooltip>
                設定を開く
            </Tooltip>
            <i class="ti ti-chevron-down"></i>
        {/if}
    </button>
</span>
{#if selectedEffectType === 'shadow'}
    <div class="options">
        <span>
            <label for="shadow-color">色</label>
            <input bind:this={shadowColorElement} type="color" id="shadow-color" value={rgbToHex(effects.shadow.color.r * 255, effects.shadow.color.g * 255, effects.shadow.color.b * 255)} onchange={() => {
                if (!shadowColorElement) {
                    return;
                }
                const value = shadowColorElement.value;
                effects.shadow.color = {
                    r: parseInt(value.slice(1, 3), 16) / 255,
                    g: parseInt(value.slice(3, 5), 16) / 255,
                    b: parseInt(value.slice(5, 7), 16) / 255,
                    a: effects.shadow.color.a,
                };
            }} />
        </span>
        <small>不透明度</small>
        <span>
            <Slider min={0} max={1} step={0.01} bind:value={effects.shadow.color.a} />
        </span>
    </div>
{/if}

<style lang="scss">
    span {
        display: flex;
        gap: 0.25rem;
        align-items: center;
        width: 100%;
    }

    .effect {
        background: var(--color-bg-2);
        color: var(--color-1);
        border: none;
        outline: none;
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: start;
        gap: 0.5rem;
        width: 100%;
        border-left: 2px solid var(--color-1);

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            padding-left: calc(1rem + 2px);
            transition: padding-left 0.0621s;
        }

        &:active {
            padding-left: 1rem;
            transition: padding-left 0.0621s;
        }

        &.active {
            background: var(--color-1);
            color: var(--color-bg-2);

            &:hover {
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }
        }
    }

    .option {
        background: var(--color-bg-2);
        color: var(--color-1);
        border: none;
        outline: none;
        padding: 0.5rem;
        width: 2.25rem;
        height: 2.25rem;
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 2px;
        cursor: pointer;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }

    .options {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-left: 1rem;
        margin-top: 0.5rem;
        margin-bottom: 1rem;
        width: calc(100% - 2.5rem);

        > span {
            display: flex;
            gap: 0.25rem;
            align-items: center;
            justify-content: space-between;
            white-space: nowrap;

            > label {
                font-size: 0.8rem;
                font-weight: 600;
            }
        }
    }
</style>
