import type { Content } from '@omujs/chat';

type EmoteRange = {
    id: string;
    start: number;
    end: number;
};

export class TwitchMessages {
    public static parse(message: string, emotes = ''): Content.Root {
        const characters = Array.from(message);
        const ranges = new Map<number, EmoteRange>();
        for (const emote of emotes.split('/')) {
            if (!emote) continue;
            const [id, positions] = emote.split(':');
            for (const position of positions.split(',')) {
                const [start, end] = position.split('-').map(Number);
                ranges.set(start, { id, start, end });
            }
        }
        const children: Content.Component[] = [];
        let previous = 0;
        for (const { id, start, end } of [...ranges.values()].sort((a, b) => a.start - b.start)) {
            if (previous !== start) children.push({ type: 'text', data: characters.slice(previous, start).join('') });
            previous = end + 1;
            children.push({
                type: 'image',
                data: { url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`, id: characters.slice(start, end + 1).join('') },
            });
        }
        if (previous !== characters.length) children.push({ type: 'text', data: characters.slice(previous).join('') });
        return { type: 'root', data: children };
    }
}
