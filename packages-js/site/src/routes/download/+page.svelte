<script lang="ts">
    import type { Platform, VersionManifest } from '$lib/api/index.js';
    import Page from '$lib/components/Page.svelte';
    import { BROWSER } from 'esm-env';
    import { getPlatform } from './download.js';

    export let data: { versions: VersionManifest };
    let downloading = false;
    let showExtra = false;

    function getVersion() {
        const platform = getPlatform();
        if (data.versions.platforms[platform] === undefined) {
            console.error(`Platform ${platform} is not supported.`);
            return;
        }
        return data.versions.platforms[platform];
    }

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
                <a href={version?.url} class="download" on:click={() => (downloading = true)}>
                    {#if downloading}
                        ダウンロード中...
                    {:else}
                        ダウンロード
                    {/if}
                    <i class="ti ti-download" />
                </a>
            {:else}
                <small> お使いのプラットフォームはサポートされていませんでした… </small>
            {/if}
            <a href="/app">
                アプリを探す
                <i class="ti ti-external-link" />
            </a>
        </p>
        <button on:click={() => (showExtra = !showExtra)}>
            <small>
                別のインストール方法をお探しですか？
                <i class="ti ti-chevron-{showExtra ? 'up' : 'down'}" />
            </small>
        </button>
        {#if showExtra}
            <ul>
                {#each Object.entries(data.versions.platforms ?? {}) as [key, platform] (key)}
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
