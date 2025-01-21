<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { IS_BETA } from '$lib/consts.js';
    import { FlexRowWrapper, Tooltip } from '@omujs/ui';
    import { DEV } from 'esm-env';
    import { onMount } from 'svelte';
    import { getPlatform, type Platform, type VersionManifest } from './download.js';

    let manifest: VersionManifest | null = null;

    let downloading = false;
    let showExtra = false;
    let loading = true;

    function getVersion(manifest: VersionManifest): (Platform & { platform: string }) | undefined {
        const platform = getPlatform();
        if (manifest.platforms[platform] === undefined) {
            console.error(`Platform ${platform} is not supported.`);
            return;
        }
        return { ...manifest.platforms[platform], platform };
    }

    $: version = manifest ? getVersion(manifest) : undefined;
    $: daysAgo = manifest && Math.floor((Date.now() - new Date(manifest.pub_date).getTime()) / (1000 * 60 * 60 * 24));

    $: if (downloading) {
        setTimeout(() => {
            downloading = false;
        }, 1000);
    }

    onMount(async () => {
        try {
            const res = await fetch(
                `https://obj.omuapps.com/app/version${IS_BETA || DEV ? '-beta' : ''}.json`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: 'follow',
                    mode: 'cors',
                },
            );
            if (res.ok) {
                manifest = await res.json();
            } else {
                console.error('Failed to fetch version manifest.');
            }
        } finally {
            loading = false;
        }
    })
</script>

<svelte:head>
    <title>OMUAPPS - ダウンロード</title>
    <meta name="description" content="OMUAPPSをダウンロードして使ってみる" />
</svelte:head>

<Page>
    <header slot="header">
        <h1>
            ダウンロード
            <i class="ti ti-download"></i>
        </h1>
        <small> OMUAPPSをダウンロードして使ってみる </small>
    </header>
    <main slot="content">
        <p>
            {#if loading}
                <small> 読み込み中... </small>
            {:else if manifest && version}
                <a href="/legal/terms" class="legal-link">
                    <p>
                        利用規約
                        <i class="ti ti-external-link"></i>
                    </p>
                    <small>使っていただくにあたって</small>
                </a>
                <a href="/legal/privacy" class="legal-link">
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
                <FlexRowWrapper>
                    <a href={version.url} class="download" on:click={() => (downloading = true)}>
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
                    <button on:click={() => (showExtra = !showExtra)} class="extra">
                        <small>
                            別のインストール方法
                            <i class="ti ti-chevron-{showExtra ? 'up' : 'down'}" />
                        </small>
                    </button>
                </FlexRowWrapper>
                {#if showExtra}
                    <ul>
                        {#each Object.entries(manifest.platforms) as [key, platform] (key)}
                            <li>
                                <a
                                    href={platform.url}
                                    class="download"
                                    on:click={() => (downloading = true)}
                                >
                                    {key}
                                    <i class="ti ti-download"></i>
                                </a>
                            </li>
                        {/each}
                    </ul>
                {/if}
                <div class="version-info">
                    <p class="version">
                        バージョン
                        {manifest.version}
                    </p>
                    <p>
                        リリース日
                        {date.toLocaleDateString()}
                        {date.toLocaleTimeString()}
                    </p>
                    {#if daysAgo && daysAgo > 0}
                        <small>
                            {daysAgo}
                            日前
                        </small>
                    {/if}
                </div>
            {:else}
                <small> お使いのプラットフォームはサポートされていませんでした… </small>
            {/if}
        </p>
    </main>
</Page>

<style lang="scss">
    h1 {
        font-size: 2rem;
        font-weight: 600;
        width: fit-content;
        color: var(--color-1);
    }

    .version-info {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
        color: var(--color-1);

        > .version {
            font-weight: 600;
        }
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
        font-size: 0.8rem;
        background: var(--color-bg-1);
        color: var(--color-1);
        margin-top: 1rem;
        margin-bottom: 1.5rem;
        padding: 0.5rem;
        width: fit-content;
    }

    .download {
        display: inline-flex;
        gap: 0.2rem;
        align-items: center;
        padding: 0.6rem 1rem;
        margin-right: 1rem;
        margin-bottom: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-bg-2);
        background: var(--color-1);
        border-radius: 2px;

        &:hover {
            color: var(--color-1);
            text-decoration: none;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
        }
    }

    .extra {
        display: inline-flex;
        gap: 0.2rem;
        align-items: center;
        padding: 0.6rem 1rem;
        margin-right: 1rem;
        margin-bottom: 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-1);
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        border: none;
        border-radius: 2px;

        &:hover {
            color: var(--color-1);
            text-decoration: none;
            background: var(--color-bg-2);
            outline: 1px solid var(--color-1);
        }
    }

    @container (max-width: 480px) {
        section {
            padding: 0 0.5rem;
        }

        header {
            margin-top: 5rem;
        }

        p {
            margin-top: 5rem;

            a {
                font-size: 0.8rem;
            }
        }

        button {
            font-size: 0.8rem;
        }
    }
</style>
