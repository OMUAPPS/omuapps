<script lang="ts">
    import { omu } from '$lib/client.js';
    import type { App } from '@omujs/omu';
    import { Localized, Tooltip } from '@omujs/ui';
    import DiffText from './DiffText.svelte';

    interface Props {
        oldApp: App;
        newApp: App;
    }

    let { oldApp, newApp }: Props = $props();

    let oldHost = $derived(oldApp.id.namespace.split('.').reverse().join('.'));
    let oldMetadata = $derived(oldApp.metadata);
    let oldIcon = $derived(oldMetadata?.icon && omu.i18n.translate(oldMetadata?.icon));
    let oldTags = $derived(oldMetadata?.tags?.join(' / '));

    let newHost = $derived(newApp.id.namespace.split('.').reverse().join('.'));
    let newMetadata = $derived(newApp.metadata);
    let newIcon = $derived(newMetadata?.icon && omu.i18n.translate(newMetadata?.icon));
    let newTags = $derived(newMetadata?.tags?.join(' / '));
</script>

<div class="info">
    <Tooltip>
        <b><DiffText old={oldHost} new={newHost} /></b> <small>によって提供されるアプリケーション</small>
    </Tooltip>
    <div class="header">
        <div class="icon">
            {#if oldIcon !== newIcon}
                <span class="diff">
                    <span class="old">
                        {#if oldIcon}
                            {#if oldIcon.startsWith('ti')}
                                <i class="ti {oldIcon}"></i>
                            {:else}
                                <img src={oldIcon} alt="" />
                            {/if}
                        {:else}
                            <i class="ti ti-package"></i>
                        {/if}
                    </span>
                    <span class="new">
                        {#if newIcon}
                            {#if newIcon.startsWith('ti')}
                                <i class="ti {newIcon}"></i>
                            {:else}
                                <img src={newIcon} alt="" />
                            {/if}
                        {:else}
                            <i class="ti ti-package"></i>
                        {/if}
                    </span>
                </span>
            {:else}
                {#if oldIcon}
                    {#if oldIcon.startsWith('ti')}
                        <i class="ti {oldIcon}"></i>
                    {:else}
                        <img src={oldIcon} alt="" />
                    {/if}
                {:else}
                    <i class="ti ti-package"></i>
                {/if}
            {/if}
        </div>
        {#if oldMetadata?.name}
            <p>
                <Localized text={oldMetadata.name} />
            </p>
        {:else}
            <p>{oldApp.id.key()}</p>
        {/if}
    </div>
    <div class="content">
        {#if oldMetadata?.name !== newMetadata?.name}
            <br>
            <small>名前</small>
            <p>
                <DiffText old={oldMetadata?.name} new={newMetadata?.name} />
            </p>
        {:else if oldMetadata?.name}
            <br>
            <small>名前</small>
            <p><Localized text={oldMetadata?.name} /></p>
        {:else}
            <br>
            <small>ID</small>
            <p>{oldApp.id.key()}</p>
        {/if}
        <small class="host">
            <br>
            <small>提供元</small>
            <p>
                <DiffText old={oldHost} new={newHost} />
            </p>
        </small>
        {#if oldMetadata?.description !== newMetadata?.description}
            <br>
            <small>説明</small>
            <small class="description">
                <DiffText old={oldMetadata?.description} new={newMetadata?.description} />
            </small>
        {:else if oldMetadata?.description}
            <br>
            <small>名前</small>
            <small class="description">
                <Localized text={oldMetadata?.description} />
            </small>
        {/if}
        {#if oldApp.version !== newApp.version}
            <br>
            <small>バージョン</small>
            <small><DiffText old={oldApp.version} new={newApp.version} /></small>
        {/if}
        {#if oldApp.url !== newApp.url}
            <br>
            <small>URL</small>
            <small><DiffText old={oldApp.url} new={newApp.url} /></small>
        {/if}
        {#if oldMetadata?.site !== newMetadata?.site}
            <br>
            <small>ウェブサイト</small>
            <small class="description">
                <DiffText old={oldMetadata?.site} new={newMetadata?.site} />
            </small>
        {/if}
        {#if oldMetadata?.repository !== newMetadata?.repository}
            <br>
            <small>リポジトリ</small>
            <small class="description">
                <DiffText old={oldMetadata?.repository} new={newMetadata?.repository} />
            </small>
        {/if}
        {#if oldMetadata?.authors !== newMetadata?.authors}
            <br>
            <small>開発者</small>
            <small class="description">
                <DiffText old={oldMetadata?.authors} new={newMetadata?.authors} />
            </small>
        {/if}
        {#if oldMetadata?.license !== newMetadata?.license}
            <br>
            <small>ライセンス</small>
            <small class="description">
                <DiffText old={oldMetadata?.license} new={newMetadata?.license} />
            </small>
        {/if}
        {#if oldTags !== newTags}
            <br>
            <small>タグ</small>
            <small class="description">
                <DiffText old={oldTags} new={newTags} />
            </small>
        {/if}
        {#if oldApp.parentId?.key() !== newApp.parentId?.key()}
            <br>
            <small>親アプリ</small>
            <small class="description">
                <DiffText old={oldApp.parentId?.key()} new={newApp.parentId?.key()} />
            </small>
        {/if}
    </div>
</div>

<style lang="scss">
    .info {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
        width: 18rem;
    }

    .header {
        display: flex;
        align-items: center;
    }

    .content {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        width: 100%;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: wrap;
        text-align: left;

        > * {
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: wrap;
        }

        > .description {
            white-space: wrap;
        }

        > .host {
            color: var(--color-text);
        }
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
        white-space: wrap;
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
