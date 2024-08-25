<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { version } from '$lib/version.json';
    import { Omu } from '@omujs/omu';
    import { AppHeader, setClient, TableList, Toggle } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { ArchiveApp } from './archive-app.js';
    import ArchiveEntry from './components/ArchiveEntry.svelte';

    export const omu = new Omu(APP);
    setClient(omu);
    const archiveApp = new ArchiveApp(omu);
    const { archiveTable, config } = archiveApp;

    omu.onReady(() => {});

    if (BROWSER) {
        omu.plugins.require({
            omuplugin_archive: `==${version}`,
        });
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP}>
            <Toggle bind:value={$config.active} />
        </AppHeader>
    </header>
    <main>
        <section style:flex="0 0 250px">
            <h2>設定</h2>
            <div class="settings">
                <div>
                    <h3>出力ディレクトリ</h3>
                    <input type="text" bind:value={$config.output_dir} />
                    <button on:click={() => archiveApp.openOutputDir()}>
                        <i class="ti ti-folder-open" />
                    </button>
                </div>
            </div>
            <div class="yt-dlp-info">
                <a href="https://github.com/yt-dlp/yt-dlp" target="_blank">
                    <h3>
                        yt-dlp
                        <i class="ti ti-external-link" />
                    </h3>
                </a>
                <p>このアプリは yt-dlp を使用しています</p>
                <p>
                    <span>バージョン:</span>
                    {$config.yt_dlp_info.version}
                    {$config.yt_dlp_info.channel}
                </p>
                <p>git head: {$config.yt_dlp_info.git_head}</p>
            </div>
        </section>
        <section>
            <h2>アーカイブリスト</h2>
            <div class="archive-list">
                <TableList table={archiveTable} component={ArchiveEntry} />
            </div>
        </section>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 2rem;
        margin: 2rem;
        color: var(--color-1);
    }

    section {
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100%;
        flex: 1;

        > h2 {
            margin-bottom: 0.5rem;
        }
    }

    .settings {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: var(--color-bg-2);
        padding: 1rem;
        font-size: 0.8rem;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
    }

    .archive-list {
        flex: 1;
        background: var(--color-bg-2);
    }

    .yt-dlp-info {
        font-size: 0.6rem;
    }
</style>
