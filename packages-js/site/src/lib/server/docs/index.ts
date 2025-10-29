import { join } from 'path';

export type DocsData = Readonly<{
    meta: DocsMeta;
    slug: string;
    content: string;
}>;

export type DocsMeta = Readonly<{
    title: string;
    description: string;
    index?: number;
    group?: string;
    icon?: string;
}>;

export type DocsSection = Readonly<{
    meta: DocsMeta;
    slug: string;
}>;

export async function getDocsData(path = 'site'): Promise<DocsData[]> {
    const { readdir, readFile } = await import('node:fs/promises');
    const docsDir = join(process.cwd(), '../..', 'documentation', path);
    const docFiles = await readdir(docsDir);
    const docsData: DocsData[] = [];

    for (const file of docFiles) {
        if (!file.endsWith('.md')) continue;
        const contentRaw = await readFile(join(docsDir, file), 'utf-8');
        const metaLines = contentRaw.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
        const metaRaw = metaLines ? Object.fromEntries(metaLines.split('\n').map((line) => line.split(': ').map((part) => part.trim()))) : {};
        const meta: DocsMeta = {
            ...metaRaw,
            index: metaRaw.index ? parseInt(metaRaw.index, 10) : undefined,
        };
        const content = contentRaw.replace(/^---\n([\s\S]*?)\n---\n/, '');
        const slug = file.replace(/\.md$/, '');

        docsData.push({ meta, slug, content });
    }

    return docsData.sort((a, b) => (a.meta.index ?? 0) - (b.meta.index ?? 0));
}

export function getDocSections(docsData: DocsData[]): Record<string, DocsSection[]> {
    const sections: Record<string, DocsSection[]> = {};

    for (const doc of docsData) {
        const group = doc.meta.group ?? 'General';
        if (!sections[group]) sections[group] = [];
        sections[group].push({ meta: doc.meta, slug: doc.slug });
    }

    return sections;
}
