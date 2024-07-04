<script lang="ts">
    import Page from '$lib/components/Page.svelte';
    import { BROWSER } from 'esm-env';
    import { getPlatform, type Platform, type VersionManifest } from './download.js';
    import { RelativeDate, Tooltip } from '@omujs/ui';

    export let data: { manifest: VersionManifest };
    let downloading = false;
    let showExtra = false;

    function getVersion() {
        if (data.manifest.platforms[platform] === undefined) {
            console.error(`Platform ${platform} is not supported.`);
            return;
        }
        return data.manifest.platforms[platform];
    }

    const platform = getPlatform();
    let version: Platform | undefined = BROWSER ? getVersion() : undefined;

    $: if (downloading) {
        setTimeout(() => {
            downloading = false;
        }, 1000);
    }
</script>

<svelte:head>
    <title>OMUAPPS - ダウンロード</title>
    <meta name="description" content="OMUAPPSをダウンロードして使ってみる" />
</svelte:head>

<Page>
    <header slot="header">
        <h1>
            ダウンロード
            <i class="ti ti-download" />
        </h1>
        <small> OMUAPPSをダウンロードして使ってみる </small>
    </header>
    <main slot="content">
        <p>
            {#if version}
                {@const date = new Date(data.manifest.pub_date)}
                <a href={version?.url} class="download" on:click={() => (downloading = true)}>
                    <Tooltip>
                        {platform} 用のインストーラーをダウンロードします
                    </Tooltip>
                    {#if downloading}
                        ダウンロード中...
                    {:else}
                        ダウンロード
                    {/if}
                    <i class="ti ti-download" />
                </a>
                <div class="version-info">
                    <p class="version">
                        {data.manifest.version}
                    </p>
                    <p>
                        リリース日
                        {date.toLocaleDateString()}
                        {date.toLocaleTimeString()}
                    </p>
                </div>
            {:else}
                <small> お使いのプラットフォームはサポートされていませんでした… </small>
            {/if}
        </p>
        <button on:click={() => (showExtra = !showExtra)}>
            <small>
                別のインストール方法をお探しですか？
                <i class="ti ti-chevron-{showExtra ? 'up' : 'down'}" />
            </small>
        </button>
        {#if showExtra}
            <ul>
                {#each Object.entries(data.manifest.platforms) as [key, platform] (key)}
                    <li>
                        <a
                            href={platform.url}
                            class="download"
                            on:click={() => (downloading = true)}
                        >
                            {key}
                            <i class="ti ti-download" />
                        </a>
                    </li>
                {/each}
            </ul>
        {/if}
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
        margin-top: 1rem;
        font-size: 0.9rem;

        p {
            color: var(--color-1);
        }

        .version {
            font-weight: 600;
        }
    }

    p {
        text-wrap: nowrap;

        a {
            display: inline-flex;
            gap: 0.2rem;
            align-items: center;
            padding: 0.6rem;
            margin-right: 1rem;
            margin-bottom: 1rem;
            font-size: 1rem;
            background: var(--color-bg-2);

            &:hover {
                background: var(--color-bg-3);
            }
        }

        .download {
            color: var(--color-bg-2);
            background: var(--color-1);

            &:hover {
                color: var(--color-1);
                text-decoration: none;
                background: var(--color-bg-2);
                outline: 1px solid var(--color-1);
            }
        }
    }

    button {
        display: flex;
        font-size: 1rem;
        color: var(--color-1);
        cursor: pointer;
        background: none;
        border: none;
        outline: none;
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
