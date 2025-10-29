<script lang="ts">
    import AppInfo from '$lib/common/AppInfo.svelte';
    import Document from '$lib/common/Document.svelte';
    import type { PluginRequestPacket } from '@omujs/omu/api/dashboard';
    import { Tooltip } from '@omujs/ui';
    import PackageEntry from './PackageEntry.svelte';
    import Screen from './Screen.svelte';
    import about_plugin from './about_plugin.md?raw';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PluginRequestPacket;
            resolve: (accept: boolean) => void;
        };
    };

    const { request, resolve } = screen.props;

    function accept() {
        resolve(true);
        screen.handle.pop();
    }

    function reject() {
        resolve(false);
        screen.handle.pop();
    }

    const SECURELIST = [
        'omuserver',
        'omuplugin-obs',
        'omuplugin-nyanya',
        'omuplugin-emoji',
        'omuplugin-discordrpc',
        'omuplugin-archive',
        'omu-chatprovider',
        'omu-chat-youtube',
        'omu-chat-twitch',
        'omu-chat',
        'omu',
        'omuplugin-marshmallow',
        'omuplugin-chat',
        'omu-chat-twitcasting',
    ].map((name) => normalizePackageName(name));

    function normalizePackageName(packageName: string): string {
        return packageName.replace(/[-_.]+/g, '-').toLowerCase();
    }

    function isPackageSecure(packageName: string): boolean {
        return SECURELIST.includes(normalizePackageName(packageName));
    }

    const securePackages = request.packages.filter((entry) =>
        isPackageSecure(entry.info.name),
    );
    const insecurePackages = request.packages.filter((entry) =>
        !isPackageSecure(entry.info.name),
    );
</script>

<Screen {screen} disableClose>
    <div class="header">
        <AppInfo app={request.app} />
        <small>は以下のプラグインのインストールを要求しています。</small>
    </div>
    <div class="packages">
        {#if insecurePackages.length > 0}
            <h3 class="insecure">
                <Tooltip>
                    <div class="tooltip">
                        <h3>非公式プラグイン</h3>
                        以下は公式または信頼できるソースから提供されていないプラグインです。注意してインストールしてください。
                    </div>
                </Tooltip>
                安全でないプラグイン
                <i class="ti ti-alert-triangle"></i>
            </h3>
            {#each insecurePackages as entry, index (index)}
                <PackageEntry {entry} secure={false} />
            {/each}
        {/if}
        {#if securePackages.length > 0}
            <h3>
                <Tooltip>
                    <div class="tooltip">
                        <h3>安全なプラグイン</h3>
                        以下は公式または信頼できるソースから提供されているプラグインです。
                    </div>
                </Tooltip>
                OMUAPPS公式プラグイン
                <i class="ti ti-info-circle"></i>
            </h3>
            {#each securePackages as entry, index (index)}
                <PackageEntry {entry} secure={true} />
            {/each}
        {/if}
    </div>
    <div class="actions">
        <button on:click={reject} class="reject">
            キャンセル
            <i class="ti ti-x"></i>
        </button>
        <button on:click={accept} class="accept">
            インストール
            <i class="ti ti-check"></i>
        </button>
    </div>
    <Document source={about_plugin} slot="info" />
</Screen>

<style lang="scss">
    .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        padding: 2rem 1.25rem;
        padding-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
        border-bottom: 1px solid var(--color-outline);
        gap: 0.5rem;
    }

    .packages {
        display: flex;
        flex-direction: column;
        gap: 0.621rem;
        padding: 2rem 1rem;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: var(--color-bg-2);
            border-radius: 1px;
        }

        &::-webkit-scrollbar-thumb {
            background: color-mix(
                in srgb,
                var(--color-1) 10%,
                transparent 0%
            );
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

        > h3 {
            padding-top: 1rem;
            padding-bottom: 1rem;
            font-size: 1rem;
            font-weight: 700;
            color: var(--color-1);
            border-bottom: 1px solid var(--color-outline);
            text-align: left;

            &.insecure {
                color: #a23023;
            }
        }
    }

    .actions {
        display: flex;
        margin-top: auto;
        margin-bottom: 4rem;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        width: 100%;
        border-top: 1px solid var(--color-outline);

        > button {
            border: none;
            padding: 0.5rem 1rem;
            font-weight: 600;
            color: var(--color-1);
            background: var(--color-bg-1);
            cursor: pointer;
            border-radius: 4px;
            flex: 1;

            &.reject {
                color: var(--color-text);
                background: var(--color-bg-1);
            }

            &.accept {
                background: var(--color-1);
                color: var(--color-bg-1);

                &:disabled {
                    background: var(--color-bg-1);
                    color: var(--color-1);
                }
            }
        }
    }
</style>
