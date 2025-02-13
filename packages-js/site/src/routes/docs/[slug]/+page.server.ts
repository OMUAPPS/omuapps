import { getDocsData } from '$lib/server/docs/index.js';
import { error } from '@sveltejs/kit';
import type { EntryGenerator } from './$types.js';

export const prerender = true;

export const entries: EntryGenerator = async () => {
    const docsData = await getDocsData();
    return docsData.map((doc) => ({ slug: doc.slug }));
};

export async function load({ params }: { params: { slug: string } }) {
    const docsData = await getDocsData();

    const doc = docsData.find((doc) => doc.slug === params.slug);

    if (!doc) {
        error(404, 'Not found');
    }

    return {
        page: doc,
    };
}
