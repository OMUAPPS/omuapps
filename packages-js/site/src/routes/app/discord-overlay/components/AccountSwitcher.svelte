<script lang="ts">
    import { isElementContains } from '$lib/helper';
    import { Spinner, Tooltip } from '@omujs/ui';
    import { DiscordOverlayApp, type AuthenticateUser } from '../discord-overlay-app';
    import VoiceChannelStatus from './VoiceChannelStatus.svelte';

    export let clients: Record<string, AuthenticateUser> = {};

    const overlayApp = DiscordOverlayApp.getInstance();
    const { config } = overlayApp;

    let state: {
        type: 'refreshing';
    } | {
        type: 'result';
        clients: Record<string, AuthenticateUser>;
    } = { type: 'result', clients };

    async function refresh() {
        if (state.type === 'refreshing') return;
        state = { type: 'refreshing' };
        await overlayApp.refresh();
        clients = await overlayApp.getClients();
        state = { type: 'result', clients };
    }

    let open = false;
    let switcherElement: HTMLElement | undefined;
    let userElement: HTMLElement | undefined;

    $: console.log(state);
</script>

<svelte:window on:click={(event) => {
    if (!switcherElement || !userElement) return;
    if (
        !isElementContains(switcherElement, event.target) &&
        !isElementContains(userElement, event.target)
    ) {
        open = false;
    }
}} />

<div class="container">
    {#if state.type === 'result'}
        {#if Object.keys(clients).length === 0}
            <small class="message">
                起動しているDiscordが見つかりませんでした
                <i class="ti ti-info-circle"></i>
            </small>
            <button class="entry refresh" on:click={refresh}>
                <Tooltip>
                    <p>ここに表示されていないアカウントがある場合お試しください。</p>
                    <p>連続で再検出を行うと検出できなくなる可能性があります。</p>
                </Tooltip>
                Discordを再検出
                <i class="ti ti-refresh"></i>
            </button>
        {:else}
            {#if !open}
                <VoiceChannelStatus />
            {/if}
            {#if open && Object.keys(clients).length > 0}
                <div class="switcher" bind:this={switcherElement}>
                    <button class="entry refresh" on:click={refresh}>
                        <Tooltip>
                            <p>ここに表示されていないアカウントがある場合お試しください。</p>
                            <p>連続で再検出を行うと検出できなくなる可能性があります。</p>
                        </Tooltip>
                        Discordを再検出
                        <i class="ti ti-refresh"></i>
                    </button>
                    {#each Object.values(clients).filter((client) => client.id !== $config.user_id) as client, index (index)}
                        <button class="entry" on:click={() => {
                            $config.user_id = client.id;
                            open = false;
                        }}>
                            <Tooltip>
                                {client.global_name ?? client.id}に切り替える
                            </Tooltip>
                            {#if client.avatar}
                                <img src="https://cdn.discordapp.com/avatars/{client.id}/{client.avatar}.png" alt="" class="avatar" />
                            {:else}
                                <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" class="avatar" />
                            {/if}
                            <small>
                                {client.global_name ?? client.id}
                            </small>
                        </button>
                    {/each}
                </div>
            {/if}
            {#if $config.user_id && clients[$config.user_id]}
                {@const user = clients[$config.user_id]}
                <button class="entry" on:click={() => {open = !open;}} bind:this={userElement}>
                    {#if !open}
                        <Tooltip>
                            アカウントを切り替える
                        </Tooltip>
                    {/if}
                    {#if user.avatar}
                        <img src="https://cdn.discordapp.com/avatars/{user.id}/{user.avatar}.png" alt="" class="avatar" />
                    {:else}
                        <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="" class="avatar" />
                    {/if}
                    <small>
                        {user.global_name ?? user.id}
                    </small>
                    <i class="ti ti-chevron-up"></i>
                </button>
            {/if}
        {/if}
    {:else if state.type === 'refreshing'}
        <div class="entry refresh">
            Discordを検出中
            <Spinner />
        </div>
    {/if}
</div>

<style lang="scss">
    .container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .switcher {
        animation: slide 0.12621s forwards;
        display: flex;
        flex-direction: column;
        gap: 1px;
        background: var(--color-bg-1);
    }

    @keyframes slide {
        0% {
            transform: translateY(2rem);
            opacity: 0;
        }

        23% {
            transform: translateY(-0.0621rem);
            opacity: 0.9621;
        }

        100% {
            transform: translateY(0);
        }
    }

    button {
        border: none;
    }

    .entry {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        display: flex;
        align-items: center;
        background: var(--color-bg-2);
        cursor: pointer;
        padding: 1rem;
        padding-right: 1.5rem;
        height: 4rem;

        > i {
            margin-left: auto;
        }

        > .avatar {
            width: 2rem;
            width: 2rem;
            border-radius: 100%;
        }

        &:hover {
            // background: var(--color-bg-1);
            outline: 1px solid var(--color-outline);
        }
    }

    .refresh {
        color: var(--color-1);
        font-size: 0.8rem;
        font-weight: 600;
    }
</style>
