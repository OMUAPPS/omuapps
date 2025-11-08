<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { App } from '@omujs/omu';
    import { Localized, Tooltip } from '@omujs/ui';

    export let app: App;

    $: namespace = app.id.namespace.split('.').reverse().join('.');
    $: path = app.id.path.join('.');
    $: metadata = app.metadata;
    $: icon = metadata?.icon && omu.i18n.translate(metadata?.icon);
</script>

<div class="info">
    <Tooltip>
        <b>{namespace}</b> <small>によって提供されるアプリケーション</small>
    </Tooltip>
    <div class="icon">
        {#if icon}
            {#if icon.startsWith('ti')}
                <i class="ti {icon}"></i>
            {:else}
                <img src={icon} alt="" />
            {/if}
        {:else}
            <i class="ti ti-package"></i>
        {/if}
    </div>
    <div class="content">
        <p>
            <span class="name">
                <Localized text={app.metadata?.name} />
            </span>
            <small class="id">
                {namespace}
                <i class="ti ti-slash"></i>
                {path}
                {#if app.version}
                    <small class="version">
                        v{app.version}
                    </small>
                {/if}
            </small>
        </p>
        <small class="description">
            <Localized text={app.metadata?.description} />
        </small>
    </div>
</div>

<style lang="scss">
    .info {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 0;

        .name {
            white-space: nowrap;
        }

        .id {
            display: flex wrap;
            align-items: baseline;
            font-size: 0.7rem;
            color: var(--color-text);
            font-weight: 600;
            margin-left: auto;
            opacity: 0.8;
        }

        .version {
            margin-left: 0.5rem;
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--color-text);
            opacity: 0.8;
        }
    }

    .content {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
    }

    .icon {
        min-width: 3rem;
        width: 3rem;
        min-height: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;

        > i {
            font-size: 2rem;
            color: var(--color-1);
        }

        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .description {
        color: var(--color-text);
        text-align: left;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        flex: 1;
    }

    p {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--color-1);
    }

    small {
        font-size: 0.7rem;
        font-weight: 600;
    }
</style>
