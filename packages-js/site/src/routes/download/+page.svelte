<script lang="ts">
    import { resolve } from '$app/paths';
    import Page from '$lib/components/Page.svelte';
    import { IS_BETA } from '$lib/consts.js';
    import { Tooltip } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import { onMount } from 'svelte';
    import { getPlatform, type Platform, type VersionManifest } from './download.js';

    let versionState: {
        type: 'loading';
    } | {
        type: 'not_supported';
    } | {
        type: 'found';
        manifest: VersionManifest;
        version: Platform & { platform: string };
    } = $state({ type: 'loading' });

    onMount(async () => {
        const res = await fetch(
            `https://obj.omuapps.com/app/version-${IS_BETA || DEV ? 'beta' : 'stable'}.json`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                redirect: 'follow',
                mode: 'cors',
            },
        );
        if (!res.ok) {
            console.error('Failed to fetch version manifest.');
        }
        const manifest = await res.json();
        const platform = getPlatform();
        if (manifest.platforms[platform] === undefined) {
            console.error(`Platform ${platform} is not supported.`);
            versionState = {
                type: 'not_supported',
            };
            return;
        }
        versionState = {
            type: 'found',
            manifest,
            version: { ...manifest.platforms[platform], platform },
        };
    });

    let downloading = $state(false);
    let showExtra = $state(false);
</script>

<svelte:head>
    <title>OMUAPPS - ダウンロード</title>
    <meta name="description" content="OMUAPPSをダウンロードして使ってみる" />
</svelte:head>

<Page headerMode="always">
    {#snippet header()}
        <header>
            <h1>
                ダウンロード
                <i class="ti ti-download"></i>
            </h1>
            <small> OMUAPPSをダウンロードして使ってみる </small>
        </header>
    {/snippet}
    {#snippet content()}
        <main>
            <div class="warning">
                <h2>現在はベータ版です。</h2>
                <p>バグや不具合が発生し、PCへの影響がある可能性があります。ご利用の際は、自己責任でお願いします。</p>
                <small>
                    お手数ですが不具合などを発見した際は
                    <b>
                        <a href={resolve('/redirect/discord')}>
                            discord
                            <i class="ti ti-external-link"></i>
                        </a>
                    </b>
                    にお問い合わせいただけると大変開発の助けになります。
                </small>
            </div>
            <div class="state">
                {#if versionState.type === 'loading'}
                    <small> 読み込み中... </small>
                {:else if versionState.type === 'found'}
                    {@const { manifest, version } = versionState}
                    <a href={resolve('/legal/terms')} class="legal-link">
                        <p>
                            利用規約
                            <i class="ti ti-external-link"></i>
                        </p>
                        <small>使っていただくにあたって</small>
                    </a>
                    <a href={resolve('/legal/privacy')} class="legal-link">
                        <p>
                            プライバシーポリシー
                            <i class="ti ti-external-link"></i>
                        </p>
                        <small>使っていただける方へお約束</small>
                    </a>
                    <p class="legal">
                        OMUAPPSをダウンロードすることで、
                        <br />
                        利用規約とプライバシーポリシーに同意したものとみなします。
                    </p>
                    <br />
                    {@const date = new Date(manifest.pub_date)}
                    <div>
                        <a href={version.url} class="download" onclick={() => {
                            downloading = true;
                            setTimeout(() => {
                                downloading = false;
                            }, 1000);
                        }}>
                            <Tooltip>
                                {version.platform} 用のインストーラーをダウンロードします
                            </Tooltip>
                            {#if downloading}
                                ダウンロード中...
                            {:else}
                                ダウンロード
                            {/if}
                            <i class="ti ti-download"></i>
                        </a>
                        <button onclick={() => (showExtra = !showExtra)} class="extra">
                            その他
                            <i class="ti ti-chevron-{showExtra ? 'up' : 'down'}"></i>
                        </button>
                    </div>
                    {#if showExtra}
                        <ul>
                            {#each Object.entries(manifest.platforms) as [key, platform] (key)}
                                <li>
                                    <a
                                        href={platform.url}
                                        class="download"
                                        onclick={() => (downloading = true)}
                                    >
                                        {key}
                                        <i class="ti ti-download"></i>
                                    </a>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                    <div class="version-info">
                        <small class="version">
                            バージョン
                            {manifest.version}
                        </small>
                        <small>
                            リリース日
                            {date.toLocaleDateString()}
                            {date.toLocaleTimeString()}
                        </small>
                    </div>
                {:else if versionState.type === 'not_supported'}
                    <small>お使いのプラットフォームはサポートされていませんでした</small>
                {/if}
            </div>
        </main>
    {/snippet}
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }

    main {
        display: flex;
        gap: 4rem;
    }

    @container (width < 400px) {
        main {
            flex-direction: column;
        }
    }

    h2 {
        font-size: 1.5rem;
        color: var(--color-1);
        border-bottom: 2px solid var(--color-1);
        margin-bottom: 1rem;
        padding-bottom: 1rem;
    }

    .warning {
        flex: 1;
    }

    .state {
        flex: 1;
    }

    .download {
        display: inline-block;
        background: var(--color-1);
        color: var(--color-bg-2);
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        border-radius: 2px;
        text-decoration: none;
    }

    .extra {
        display: inline-block;
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        color: var(--color-1);
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        border-radius: 2px;
        text-decoration: none;
        border: none;
        margin-left: auto;
    }

    .legal-link {
        display: inline-flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.4rem 0;
        font-size: 1rem;
        background: var(--color-bg-2);
        margin-bottom: 0rem;
        margin-right: 2rem;
        margin-bottom: 2px;

        > small {
            font-size: 0.6rem;
            color: var(--color-text);
        }

        &:hover {
            text-decoration: none;
            border-bottom: 2px solid var(--color-1);
            margin-bottom: 0px;
        }
    }

    .legal {
        margin-top: 1rem;
    }
</style>
