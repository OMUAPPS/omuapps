<script lang="ts">
    import type { DiscordOverlayApp } from '../discord-overlay-app.js';
    import UserConfigEntry from './UserConfigEntry.svelte';

    export let overlayApp: DiscordOverlayApp;
    const { voiceState, config } = overlayApp;

</script>

<div class="list">
    {#each Object.entries($voiceState)
        .sort(([a,], [b,]) => $config.users[a]?.position[0] - $config.users[b]?.position[0]) as [id, state] (id)}
        <div class="entry">
            <UserConfigEntry {overlayApp} {id} {state} />
        </div>
    {:else}
        <div class="message">
            {#if $config.channel_id && $config.guild_id}
                <p>
                    まだ誰も居ないようです…
                </p>
                <small>誰かがボイスチャンネルに入ると表示されます</small>
            {:else}
                <p>
                    VCに入ると表示されます
                </p>
                <small>ボイスチャンネルに入ってみましょう</small>
            {/if}
        </div>
    {/each}
</div>

<style lang="scss">
    .list {
        position: absolute;
        inset: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        align-content: start;
        border-left: 1px solid var(--color-outline);
        padding-left: 1rem;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--color-1) 10%, transparent 0%);
            border: 1px solid var(--color-bg-2);
            border-radius: 1px;
        }

        &:hover {
            &::-webkit-scrollbar-thumb {
                background: var(--color-1);
            }
        }

        @supports not selector(::-webkit-scrollbar) {
            & {
                scrollbar-color: var(--color-1) var(--color-bg-2);
            }
        }
    }

    .message {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 0.9rem;
        padding-top: 2rem;
    }

    small {
        color: var(--color-text);
        font-size: 0.7rem;
    }

    .entry {
        width: 14rem;
        height: fit-content;
    }
</style>
