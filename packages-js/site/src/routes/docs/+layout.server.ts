import { getDocSections, getDocsData } from '$lib/server/docs/index.js';

export const prerender = true;

export async function load() {
    const docsData = await getDocsData();

    return {
        sections: getDocSections(docsData),
    };
}
