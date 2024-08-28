<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { models } from '@omujs/chat';

    export let channel: models.Channel;
    export let active = false;
</script>

<button class="channel-entry" class:active on:click>
    <div class="icon">
        <img src={omu.assets.proxy(channel.iconUrl)} alt="icon" />
    </div>
    <div class="info">
        <div class="name">{channel.name}</div>
        <div class="provider">{channel.providerId}</div>
    </div>
    <i class={active ? 'ti ti-check' : 'ti ti-plus'} />
</button>

<style lang="scss">
    .channel-entry {
        display: flex;
        align-items: center;
        width: 100%;
        height: 60px;
        padding: 10px;
        cursor: pointer;
        background: var(--color-bg-1);
        border: 1px solid var(--color-bg-2);

        &:hover {
            background: var(--color-bg-2);
        }

        .icon {
            width: 32px;
            min-width: 32px;
            height: 32px;
            min-height: 32px;
            margin-right: 10px;
            overflow: hidden;
            border-radius: 50%;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        .info {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            width: 100%;
        }

        .name {
            font-size: 16px;
        }

        .provider {
            font-size: 12px;
            opacity: 0.5;
        }

        &.active {
            color: var(--color-bg-2);
            background: var(--color-1);

            .name {
                font-weight: bold;
            }
        }
    }
</style>
