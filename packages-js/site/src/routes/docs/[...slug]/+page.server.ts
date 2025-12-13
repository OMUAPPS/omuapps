import { error } from '@sveltejs/kit';
import { getDocsData, normalizeSlug } from '../server.js';
import type { EntryGenerator } from './$types.js';

export const prerender = true;

export const entries: EntryGenerator = async () => {
    const docsData = await getDocsData();
    return docsData.map((doc) => ({ slug: doc.slug }));
};

export async function load({ params }: { params: { slug: string } }) {
    const docsData = await getDocsData();

    const slug = normalizeSlug(params.slug);
    const doc = docsData.find((doc) => doc.slug === slug);

    if (!doc) {
        error(404, 'Not found');
    }

    return {
        page: doc,
    };
}
