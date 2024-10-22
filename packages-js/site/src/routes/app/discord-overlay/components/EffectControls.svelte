<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    const { config } = overlayApp;
</script>

<div class="camera-controls">
    <button on:click={() => {
        $config.effects.shadow = !$config.effects.shadow;
    }} class:active={$config.effects.shadow}>
        <Tooltip>
            影をつける
        </Tooltip>
        <i class="ti ti-square-half"/>
    </button>
    <button on:click={() => {
        $config.effects.backlightEffect = !$config.effects.backlightEffect;
    }} class:active={$config.effects.backlightEffect}>
        <Tooltip>
            逆光効果をかける
        </Tooltip>
        <i class="ti ti-blur"/>
    </button>
    <button on:click={() => {
        $config.effects.bloom = !$config.effects.bloom;
    }} class:active={$config.effects.bloom}>
        <Tooltip>
            ブルームをかける
        </Tooltip>
        <i class="ti ti-sun"/>
    </button>
</div>

<style lang="scss">
    .camera-controls {
        position: absolute;
        left: 1rem;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;

        > button {
            background: var(--color-bg-2);
            color: var(--color-1);
            border: none;
            outline: none;
            padding: 0.5rem;
            border-radius: 999rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;

            &:hover {
                outline: 1px solid var(--color-1);
                outline-offset: -1px;
            }

            &:disabled {
                cursor: not-allowed;
                background: transparent;
                color: var(--color-text);

                &:hover {
                    background: transparent;
                    color: var(--color-text);
                }
            }

            &.active {
                background: var(--color-1);
                color: var(--color-bg-2);

                &:hover {
                    outline: 2px solid var(--color-bg-2);
                    outline-offset: -3px;
                }
            }
        }
    }
</style>
