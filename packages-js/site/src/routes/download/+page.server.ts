import type { VersionManifest } from './download.js';

export const prerender = true;

export async function load() {
    const manifest: VersionManifest = await fetch(
        'https://github.com/OMUAPPS/omuapps/releases/latest/download/latest.json',
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
        },
    ).then((res) => res.json());

    function formatDownload(url: string) {
        if (url.endsWith('.tar.gz')) {
            return url.replace('.tar.gz', '');
        }
        if (url.endsWith('.nsis.zip')) {
            return url.replace('.nsis.zip', '.exe');
        }
        return url;
    }

    manifest.platforms = Object.fromEntries(
        Object.entries(manifest.platforms).map(([platform, { signature, url }]) => {
            return [platform, { signature, url: formatDownload(url) }];
        }),
    );

    return { manifest };
}
