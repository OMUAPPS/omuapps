import { join } from 'path';

export type DocsData = {
    readonly title: string;
    readonly slug: string;
    readonly content: string;
};

export type DocsSection = {
    readonly title: string;
    readonly slug: string;
};

export async function getDocsData(path = 'create'): Promise<DocsData[]> {
    const { readdir, readFile } = await import('node:fs/promises');
    const docsDir = join(process.cwd(), '../..', 'documentation', path);
    const docFiles = await readdir(docsDir, { recursive: true });
    const docsData: DocsData[] = [];

    for (const file of docFiles) {
        const content = await readFile(join(docsDir, file), 'utf-8');
        const title = content.match(/# (.+)/)?.[1] ?? 'Untitled';
        const slug = file.replace(/\.md$/, '');

        docsData.push({ title, slug, content });
    }

    return docsData;
}

export function getDocSections(docsData: DocsData[]): DocsSection[] {
    return docsData.map(({ title, slug }) => ({ title, slug }));
}
