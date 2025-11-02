<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { comparator } from '$lib/helper';
    import { OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { Tooltip } from '@omujs/ui';
    import { ASSET_APP } from './app';
    import AccountSwitcher from './components/AccountSwitcher.svelte';
    import AvatarAdjustModal from './components/AvatarAdjustModal.svelte';
    import AvatarRenderer from './components/AvatarRenderer.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import VisualConfig from './components/VisualConfig.svelte';
    import { createUserConfig, DiscordOverlayApp, type AuthenticateUser } from './discord-overlay-app.js';
    import { dragState, selectedAvatar } from './states.js';

    export let omu: Omu;
    export let obs: OBSPlugin;
    export let overlayApp: DiscordOverlayApp;
    const { voiceState, config } = overlayApp;

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = createUserConfig();
            $config.users[id] = user;
        }
        return user;
    }

    $: Object.keys($voiceState).forEach(id => {
        getUser(id);
    });

    let dimentions: { width: number; height: number } = { width: 0, height: 0 };

    let clients: Record<string, AuthenticateUser> = {};
    let ready = false;

    omu.onReady(async () => {
        await overlayApp.waitForReady();
        clients = await overlayApp.getClients();
        ready = true;
    });

    $: {
        const userFound = $config.user_id && clients[$config.user_id] || null;
        if (Object.keys(clients).length > 0 && !userFound) {
            $config.user_id = Object.keys(clients)[0];
        }
    }

    let settingsOpen = false;
</script>

<main>
    {#if ready}
        <div class="canvas" bind:clientWidth={dimentions.width} bind:clientHeight={dimentions.height}>
            <AvatarRenderer overlayApp={overlayApp} />
            {#if $selectedAvatar && $config.avatars[$selectedAvatar]}
                <AvatarAdjustModal overlayApp={overlayApp} bind:avatarConfig={$config.avatars[$selectedAvatar]} />
            {:else}
                {#if dimentions}
                    {#each Object.entries($voiceState)
                        .sort(comparator(([id]) => {
                            const user = $config.users[id];
                            return user.lastDraggedAt;
                        })) as [id, state] (id)}
                        {#if state}
                            <UserDragControl {dimentions} {overlayApp} {id} {state} bind:user={$config.users[id]} />
                        {/if}
                    {/each}
                {/if}
            {/if}
        </div>
    {/if}
    {#if !$dragState && !$selectedAvatar}
        <div class="menu">
            <h4>
                配信ソフトに追加する
                <i class="ti ti-arrow-bar-to-down"></i>
            </h4>
            <section style="margin-bottom: auto;">
                <AssetButton asset={ASSET_APP} permissions={[
                    OmuPermissions.ASSET_DOWNLOAD_PERMISSION_ID,
                    'com.omuapps:plugin-discordrpc/vc/read',
                ]} {omu} {obs} dimensions={{ width: 1920, height: 1080 }} />
            </section>
            <AccountSwitcher bind:clients />
        </div>
        <div class="config">
            <button on:click={() => {
                $config.effects.backlightEffect.active = !$config.effects.backlightEffect.active;
            }} class:active={$config.effects.backlightEffect.active}>
                <Tooltip>
                    注意！高GPU使用率
                </Tooltip>
                <i class="ti ti-sun"></i>
                逆光効果
            </button>
            <button on:click={() => {
                $config.effects.shadow.active = !$config.effects.shadow.active;
            }} class:active={$config.effects.shadow.active}>
                <Tooltip>
                    影をつけて見やすくします
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
                アバターの影
            </button>
            <button on:click={() => {
                $config.effects.speech.active = !$config.effects.speech.active;
            }} class:active={$config.effects.speech.active}>
                <Tooltip>
                    喋ってないときに暗くなり、喋ると明るくなります
                </Tooltip>
                <i class="ti ti-ghost-3"></i>
                明るさ調整
            </button>
            <button on:click={() => {
                $config.show_name_tags = !$config.show_name_tags;
            }} class:active={$config.show_name_tags}>
                <i class="ti ti-label"></i>
                名前を表示
            </button>
        </div>
        <div class="settings">
            <button on:click={() => {settingsOpen = !settingsOpen;}}>
                <i class="ti ti-settings"></i>
                詳細設定
                {#if settingsOpen}
                    <i class="ti ti-chevron-up"></i>
                {:else}
                    <i class="ti ti-chevron-down"></i>
                {/if}
            </button>
            {#if settingsOpen}
                <VisualConfig {overlayApp} />
            {/if}
        </div>
    {/if}
</main>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: column;
    }

    .canvas {
        position: absolute;
        inset: 0;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid var(--color-outline);
    }

    .menu {
        position: absolute;
        top: 0;
        bottom: 0;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        z-index: 1;
        width: 20rem;
        margin: 1rem;
        animation: slide-in 0.0621s ease;
    }

    .config {
        position: absolute;
        top: 0;
        right: 0;
        left: auto;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        align-items: stretch;
        z-index: 1;
        margin: 1rem;
        margin-left: 24rem;
        animation: slide-in 0.0621s ease;

        > button {
            border: none;
            padding: 0.5rem 0.75rem;
            font-size: 0.9rem;
            font-weight: 600;
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
            cursor: pointer;
            border-radius: 2px;
            white-space: nowrap;

            > i {
                margin-right: 0.25rem;
            }

            &.active {
                background: var(--color-1);
                color: var(--color-bg-1);
            }
        }
    }

    .settings {
        position: absolute;
        top: 5rem;
        right: 0;
        gap: 1rem;
        padding: 0.5rem;
        display: flex;
        width: 20rem;
        flex-direction: column;
        align-items: flex-end;
        z-index: 1;
        margin: 1rem;
        animation: slide-in 0.0621s ease;

        > button {
            border: none;
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            background: var(--color-1);
            color: var(--color-bg-1);
            cursor: pointer;
            border-radius: 2px;
        }
    }

    @keyframes slide-in {
        from {
            transform: translateX(-0.5rem);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
</style>
