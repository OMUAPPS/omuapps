import type { Content } from '@omujs/chat';

import type { JsonPath } from './youtube-page.js';

export class YoutubeRuns {
    public static parse(runs: JsonPath): Content.Root {
        const children: Content.Component[] = [];
        for (const run of runs.get('runs').list()) {
            const text = run.get('text').string();
            if (text !== undefined) {
                const url = run.get('navigationEndpoint', 'urlEndpoint', 'url').string();
                if (url) children.push({ type: 'link', data: { url, children: [{ type: 'text', data: text }] } });
                else children.push({ type: 'text', data: text });
                continue;
            }
            const emoji = run.get('emoji');
            if (emoji.has()) {
                const name = emoji.get('shortcuts', 0).string();
                children.push({
                    type: 'image',
                    data: {
                        url: YoutubeRuns.bestThumbnail(emoji.get('image', 'thumbnails')),
                        id: emoji.get('emojiId').string() ?? '',
                        ...(name ? { name } : {}),
                    },
                });
                continue;
            }
            throw new Error(`Unknown run: ${JSON.stringify(run.value)}`);
        }
        return { type: 'root', data: children };
    }

    public static bestThumbnail(thumbnails: JsonPath): string {
        const sorted = thumbnails.list().sort((a, b) => YoutubeRuns.area(b) - YoutubeRuns.area(a));
        const url = sorted[0]?.get('url').string();
        if (!url) throw new Error('No thumbnails found');
        return YoutubeRuns.normalizeUrl(url);
    }

    public static accessibilityLabel(data: JsonPath): string | undefined {
        return data.get('accessibilityData', 'label').string();
    }

    public static normalizeUrl(url: string): string {
        const parsed = new URL(url.startsWith('//') ? `https:${url}` : url, 'https://youtube.com');
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
    }

    private static area(thumbnail: JsonPath): number {
        return Number(thumbnail.get('width').value ?? 0) * Number(thumbnail.get('height').value ?? 0);
    }
}
