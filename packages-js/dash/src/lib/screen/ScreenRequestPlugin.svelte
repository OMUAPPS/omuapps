<script lang="ts">
    import Document from '$lib/common/Document.svelte';
    import { App } from '@omujs/omu';
    import type { PromptRequestAppPlugins, PromptResult } from '@omujs/omu/api/dashboard';
    import { Tooltip } from '@omujs/ui';
    import PackageEntry from './_components/EntryPackage.svelte';
    import about_plugin from './_docs/about_plugin.md?raw';
    import AppAgreementScreen from './AppAgreementScreen.svelte';
    import type { ScreenHandle } from './screen.js';

    interface Props {
        handle: ScreenHandle;
        props: {
            request: PromptRequestAppPlugins;
            resolve: (accept: PromptResult) => void;
        };
    }

    let { handle, props }: Props = $props();

    const { request, resolve } = props;

    function accept() {
        resolve('accept');
        handle.close();
    }

    function reject() {
        resolve('deny');
        handle.close();
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

<AppAgreementScreen
    app={App.deserialize(request.app)}
    {handle}
    {resolve}
>
    <small>以下のプラグインのインストールを要求しています。</small>
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
    {#snippet info()}
        <Document source={about_plugin} />
    {/snippet}
</AppAgreementScreen>

<style lang="scss">
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
</style>
