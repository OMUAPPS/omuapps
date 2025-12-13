import { join } from 'path';

export type DocsData = Readonly<{
    meta: DocsMeta;
    group: string;
    slug: string;
    content: string;
    editUrl: string;
}>;

export type DocsMeta = Readonly<{
    title: string;
    description: string;
    index?: number;
    icon?: string;
}>;

export type DocsSection = Readonly<{
    meta: DocsMeta;
    slug: string;
    editUrl: string;
}>;

export function normalizeSlug(slug: string): string {
    const match = /(?<id>(?:\/?[\w-]+)+)\/?(?:\.md)?$/.exec(slug);
    if (!match?.groups?.id) throw new Error(`Slug ${slug} is invalid`);
    const { id } = match.groups;
    const path = id.split('/');
    while (path[path.length - 1] === 'index') {
        path.length--;
    }
    return path.join('/');
}

export async function getDocsData(path = 'site'): Promise<DocsData[]> {
    const { readdir, readFile } = await import('node:fs/promises');
    const docsDir = join(process.cwd(), '../..', 'documentation', path);
    const docFiles = await readdir(docsDir, { recursive: true });
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
        const path = file.replace(/\\/, '/');
        const slug = normalizeSlug(path);
        const group = path.split('/')[0];
        const editUrl = `https://github.com/OMUAPPS/omuapps/blob/develop/documentation/site/${file}`;
        docsData.push({ meta, slug, content, group, editUrl });
    }

    return docsData.sort((a, b) => (a.meta.index ?? 0) - (b.meta.index ?? 0));
}

export function getDocSections(docsData: DocsData[]): Record<string, DocsSection[]> {
    const sections: Record<string, DocsSection[]> = {
        index: [],
        guide: [],
        app: [],
        api: [],
    };
    for (const doc of docsData) {
        const group = doc.group;
        if (!sections[group]) sections[group] = [];
        sections[group].push({ meta: doc.meta, slug: doc.slug, editUrl: doc.editUrl });
    }

    return sections;
}
