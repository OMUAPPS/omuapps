import { join } from 'path';

export type DocsData = {
    readonly meta: DocsMeta;
    readonly slug: string;
    readonly content: string;
};

export type DocsMeta = {
    readonly title: string;
    readonly description: string;
};

export type DocsSection = {
    readonly meta: DocsMeta;
    readonly slug: string;
};

export async function getDocsData(path = 'create'): Promise<DocsData[]> {
    const { readdir, readFile } = await import('node:fs/promises');
    const docsDir = join(process.cwd(), '../..', 'documentation', path);
    const docFiles = await readdir(docsDir, { recursive: true });
    const docsData: DocsData[] = [];

    for (const file of docFiles) {
        const contentRaw = await readFile(join(docsDir, file), 'utf-8');
        const metaLines = contentRaw.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
        const meta: DocsMeta = metaLines ? Object.fromEntries(metaLines.split('\n').map((line) => line.split(': ').map((part) => part.trim()))) : {};
        const content = contentRaw.replace(/^---\n([\s\S]*?)\n---\n/, '');
        const slug = file.replace(/\.md$/, '');

        docsData.push({ meta, slug, content });
    }

    return docsData;
}

export function getDocSections(docsData: DocsData[]): DocsSection[] {
    return docsData.map(({ meta, slug }) => ({ meta, slug }));
}
