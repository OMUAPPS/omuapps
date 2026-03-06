<script lang="ts">
    import { browser } from '$app/environment';
    import { Chat, ChatPermissions, Models } from '@omujs/chat';
    import { OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import type { NetworkStatus } from '@omujs/omu/network';
    import { setGlobal, Spinner, TableList } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import MessageEntry from '../_components/MessageEntry.svelte';
    import { HUD_APP } from '../app.js';
    import { ChatOverlayApp } from '../chat-app.js';
    import WindowResizer from './WindowResizer.svelte';

    const omu = new Omu(HUD_APP);
    const obs = OBSPlugin.create(omu);
    const clockApp = new ChatOverlayApp(omu);
    const chat = Chat.create(omu);
    setGlobal({ omu, obs, chat });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }

    let status: NetworkStatus = $state({ type: 'connecting' });

    omu.network.event.status.listen((value) => {
        status = value;
    });

    let sort = (a: Models.Message) => {
        if (!a.createdAt) return 0;
        return a.createdAt.getTime();
    };

    let filter = (_: string, message: Models.Message) => message.deleted !== true;
</script>

<main>
    <div class="control">
        <div class="drag" data-tauri-drag-region>
            <i class="ti ti-hand-stop"></i>
            <p>チャットを移動</p>
        </div>
        <button title="close" onclick={() => {
            close();
        }}>
            <i class="ti ti-x"></i>
        </button>
    </div>
    <TableList
        table={chat.messages}
        {filter}
        {sort}
        reverse={true}
    >
        {#snippet component({ entry })}
            <MessageEntry {entry} />
        {/snippet}
    </TableList>
    <div class="overlay">
        {#if status.type === 'connecting'}
            <p>
                接続中
                <Spinner />
            </p>
        {:else if status.type === 'disconnected'}
            {@const { reason } = status}
            切断されました
            {#if reason}
                <code>
                    {reason.type}
                    {reason.message}
                </code>
            {/if}
        {/if}
    </div>
</main>
{#if browser}
    <WindowResizer />
{/if}

<style lang="scss">
    :global(body) {
        background: transparent !important;
        overscroll-behavior: none;
        touch-action: none;
    }

    main {
        background: rgba($color: #000000, $alpha: 0.65);
        color: #fff;
        outline: 1px solid rgba($color: #000000, $alpha: 0.25);
        outline-offset: -1px;
        inset: 2px;
        box-shadow: 0 0 0.25rem #4444;
        position: absolute;
        border-radius: 1rem;
        overflow: hidden;
        transition: background 0.1s;
        color: #eee;
        margin: 0.25rem;
        animation: fade 0.2s forwards;
    }

    main:hover {
        background: rgba($color: #000000, $alpha: 0.765);
    }

    @keyframes fade {
        0% {
            opacity: 0;
            scale: 0.95;
        }

        100% {
            opacity: 1;
            scale: 1;
        }
    }

    .control {
        position: absolute;
        display: flex;
        align-items: stretch;
        justify-content: center;
        bottom: 0rem;
        left: 0;
        right: 0;
        opacity: 0;
        z-index: 1;
        animation: controlOut 0.1s forwards;
        overflow: hidden;
        box-shadow: 0 0 1rem rgba($color: #000000, $alpha: 0.5);
    }

    main:hover > .control {
        animation: controlIn 0.067s forwards;
    }

    @keyframes controlIn {
        0% {
            opacity: 0;
            bottom: -0.3rem;
        }

        100% {
            bottom: 0;
            opacity: 1;
        }
    }

    @keyframes controlOut {
        0% {
            bottom: 0;
            opacity: 1;
        }

        100% {
            opacity: 0;
            bottom: -0.3rem;
        }
    }

    .drag {
        width: 100%;
        height: 3rem;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #eee;
        background: rgba($color: #000000, $alpha: 0.9);
        outline: 1px solid #000;
        cursor: grab;

        > * {
            pointer-events: none;
        }

        > p {
            font-size: 0.778rem;
            font-weight: 500;
            margin-left: 0.5rem;
        }
    }

    .control > button {
        width: 4rem;
        background: rgba($color: #000000, $alpha: 0.9);
        outline: 1px solid #000;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #eee;
        font-size: 1.2rem;
        border-left: 1px solid #444;
        cursor: pointer;

        &:hover {
            background: rgba($color: rgb(206, 13, 13), $alpha: 0.9);
            color: #fff;
        }
    }

    .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        pointer-events: none;

        > code {
            color: var(--color-text);
            font-size: 0.8rem;
            margin: 1rem;
        }
    }
</style>
