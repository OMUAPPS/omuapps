<script lang="ts">
    import type { models } from '@omujs/chat';
    import { onDestroy } from 'svelte';

    import { t } from '$lib/i18n/i18n-context.js';

    import { chat, omu } from '$lib/client.js';
    import ProviderIcon from '$lib/common/ProviderIcon.svelte';
    import Screen from '$lib/screen/Screen.svelte';
    import { type ScreenHandle } from '$lib/screen/screen.js';
    import { IdentifierMap } from '@omujs/omu/identifier.js';
    import { Button, Textbox, Tooltip } from '@omujs/ui';

    export let screen: {
        handle: ScreenHandle;
        props: undefined;
    };

    let result: IdentifierMap<{ channel: models.Channel; active: boolean }> | undefined;

    let locked = false;
    let url: string = '';

    function fetchChannels() {
        if (locked) return;
        console.log(`fetching channels from ${url}`);
        locked = true;
        chat.createChannelTree(url)
            .then((res) => {
                result = new IdentifierMap();
                for (const v of res) {
                    result.set(v.id, { channel: v, active: false });
                }
                console.log(result);
            })
            .finally(() => {
                locked = false;
            });
    }

    function finish() {
        if (!result?.size) return;
        const channels = [...result.values()].filter((v) => v.active).map((v) => v.channel);
        chat.channels!.add(...channels);
        screen.handle.pop();
    }

    function reset() {
        result = undefined;
    }

    function skip() {
        screen.handle.pop();
    }

    let tooltipHint: string;
    let hints = [
        'youtu.be/xxxx...',
        'youtube.com/watch?v=xxxx...',
        'youtube.com/@xxxx...',
        'youtube.com/channel/xxxx...',
    ];

    function updateHint() {
        tooltipHint = hints[hints.indexOf(tooltipHint) + 1] || hints[0];
    }

    updateHint();
    const handle = setInterval(updateHint, 1400);

    onDestroy(() => {
        clearInterval(handle);
    });
</script>

<Screen {screen} title="setup" disableClose>
    <div class="container">
        <div class="content">
            {#if result}
                <div class="description">{$t('setup.which_channel')}</div>
                <div class="list">
                    {#each result.entries() as [key, { channel, active }] (key)}
                        <button class="item" class:active on:click={() => (active = !active)}>
                            <i class="ti ti-{active ? 'check' : 'plus'}" />
                            <div class="channel-icon">
                                {#if channel.iconUrl}
                                    <img src={omu.assets.proxy(channel.iconUrl)} alt="icon" />
                                    <Tooltip>
                                        <img
                                            src={omu.assets.proxy(channel.iconUrl)}
                                            alt="icon"
                                            class="tooltip-image"
                                        />
                                    </Tooltip>
                                {:else}
                                    <ProviderIcon providerId={channel.providerId} />
                                {/if}
                            </div>
                            <div class="description">
                                <div class="channel-name">
                                    {channel.name || channel.providerId}
                                </div>
                                <small class="channel-url">{channel.url}</small>
                            </div>
                        </button>
                    {/each}
                </div>
                <div class="buttons">
                    <Button
                        on:click={finish}
                        disabled={![...result.values()].some((v) => v.active)}
                        rounded
                        filled>{$t('setup.append')}</Button
                    >
                    <Button on:click={reset} rounded filled>{$t('setup.start_again')}</Button>
                </div>
            {:else}
                <div class="description">{$t('setup.please_put_in_urls')}</div>
                <div class="input">
                    <Textbox
                        bind:value={url}
                        on:input={fetchChannels}
                        placeholder={tooltipHint}
                        disabled={locked}
                    />
                    {#each hints as hint}
                        <p>{hint}</p>
                    {/each}
                </div>
            {/if}
        </div>
        <button on:click={skip} class="skip">
            {$t('setup.skip')}
            <i class="ti ti-arrow-right" />
        </button>
    </div>
</Screen>

<style lang="scss">
    .container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-text);
        font-weight: bold;
    }

    .input {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: center;
        width: 100%;
        font-weight: normal;
    }

    .skip {
        position: absolute;
        right: 20px;
        bottom: 20px;
        padding: 5px 0;
        font-size: 12px;
        color: var(--color-1);
        cursor: pointer;
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--color-1);
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        justify-content: center;
        width: 500px;
        min-height: 250px;
        padding: 20px;
        background: var(--color-bg-2);
    }

    .list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-height: 300px;
        overflow: auto;
    }

    .item {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 5px 10px;
        background: var(--color-bg-1);
        border: 1px solid var(--color-bg-1);
        border-radius: 5px;

        &:hover {
            background: var(--color-bg-2);
        }

        &.active {
            color: var(--color-bg-1);
            background: var(--color-1);
        }
    }

    .channel-icon {
        width: 32px;
        min-width: 32px;
        height: 32px;
        margin: 10px;
        border-radius: 50%;

        img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
        }

        .tooltip-image {
            width: 200px;
            height: 200px;
            padding: 0;
            margin: 0;
            border-radius: 0;
        }
    }

    .description {
        display: flex;
        flex-direction: column;
        gap: 5px;
        align-items: flex-start;
        justify-content: center;
        width: 100%;
        overflow: hidden;
        font-size: 16px;
        text-align: center;
        text-overflow: ellipsis;
    }

    .channel-name {
        font-size: 1rem;
        opacity: 1;
    }

    .channel-url {
        opacity: 0.5;
    }

    .buttons {
        display: flex;
        flex-direction: row;
        gap: 10px;
        align-items: center;
        justify-content: center;
        width: 100%;
    }
</style>
