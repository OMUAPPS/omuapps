<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';

    export let overlayApp: DiscordOverlayApp;
    const { config, voiceState } = overlayApp;

    function alignAvatars() {
        const voiceUsers = Object.keys($voiceState);
        const visibleUsers = voiceUsers.filter((id) => $config.users[id].show).map((id) => ({id, user: $config.users[id]}));
        const gap = 500;
        const totalWidth = visibleUsers.length * gap;
        const start = -totalWidth / 2;
        visibleUsers.forEach(({ user }, i) => {
            user.position = [start + (i + 0.5) * gap, 150];
        });
        $config = { ...$config };
    }

    function resetCamera() {
        $config.camera_position = [0, 0];
        $config.zoom_level = 0;
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'r') {
            resetCamera();
        }
        if (e.key === 'a') {
            alignAvatars();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="camera-controls">
    <div class="buttons">
        <button on:click={alignAvatars}>
            <Tooltip>
                アバターを整列
            </Tooltip>
            <i class="ti ti-keyframes"/>
        </button>
        <button on:click={resetCamera} disabled={$config.zoom_level === 0 && $config.camera_position[0] === 0 && $config.camera_position[1] === 0}>
            <Tooltip>
                カメラをリセット
            </Tooltip>
            <i class="ti ti-compass"/>
        </button>
    </div>
    <span class="zoom-level">
        <button disabled={$config.zoom_level <= -2} on:click={() => $config.zoom_level -= 0.5}>
            <i class="ti ti-zoom-out"/>
        </button>
        <input type="range" bind:value={$config.zoom_level} min={-2} max={2} step={0.01}/>
        <button disabled={$config.zoom_level >= 2} on:click={() => $config.zoom_level += 0.5}>
            <i class="ti ti-zoom-in"/>
        </button>
    </span>
</div>

<style lang="scss">
    .camera-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1rem;

        > .zoom-level {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;

            > input {
                appearance: none;
                width: 8rem;
                height: 0.5rem;
                background: var(--color-bg-2);
                border-radius: 999rem;
                outline: 1px solid var(--color-outline);
                cursor: pointer;
                transition: background 0.0621s;

                &::-webkit-slider-thumb {
                    appearance: none;
                    width: 1rem;
                    height: 1rem;
                    background: var(--color-1);
                    border-radius: 100%;
                    cursor: pointer;
                }

                &:hover {
                    &::-webkit-slider-thumb {
                        outline: 4px solid var(--color-bg-2);
                    }
                }

                &:active {
                    &::-webkit-slider-thumb {
                        cursor: grabbing;
                        background: var(--color-bg-2);
                        outline: 2px solid var(--color-1);
                        outline-offset: -2px;
                    }
                }
            }

            > button {
                background: transparent;
                color: var(--color-1);
                border: none;
                outline: none;
                width: 2rem;
                height: 2rem;
                border-radius: 2px;
                cursor: pointer;

                &:disabled {
                    cursor: not-allowed;
                    color: var(--color-text);
                }
            }
        }

        > .buttons {
            display: flex;
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
                    background: var(--color-1);
                    color: var(--color-bg-2);
                }

                &:active {
                    cursor: grabbing;
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
            }
        }

        &:hover {
            > .buttons > button:not(:disabled) {
                outline: 1px solid var(--color-outline);
            }
        }
    }
</style>
