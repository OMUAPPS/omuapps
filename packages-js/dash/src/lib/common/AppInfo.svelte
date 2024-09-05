<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { App } from '@omujs/omu';
    import { Localized, Tooltip } from '@omujs/ui';
    
    export let app: App;

    $: namespace = app.id.namespace;
    $: path=app.id.path.reverse().join('.');
    
    const metadata = app.metadata;
    const icon = metadata?.icon ? omu.i18n.translate(metadata?.icon) : 'No icon';
</script>


<div class="info">
    <Tooltip>
        <b>{namespace}</b> <small>によって提供されるアプリケーション</small>
    </Tooltip>
    <div class="icon">
        {#if icon.startsWith('ti-')}
            <i class="ti {icon}" />
        {:else}
            <img src={icon} alt="" />
        {/if}
    </div>
    <div class="content">
        <p>
            <Localized text={app.metadata?.name}/>
            <small class="id">
                {namespace}
                <i class="ti ti-slash" />
                {path}
                {#if app.version}
                    <small class="version">
                        v{app.version}
                    </small>
                {/if}
            </small>
        </p>
        <small class="description">
            <Localized text={app.metadata?.description}/>
        </small>
    </div>
</div>

<style lang="scss">
    .info {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .id {
            display: flex;
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
        width: 3rem;
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
