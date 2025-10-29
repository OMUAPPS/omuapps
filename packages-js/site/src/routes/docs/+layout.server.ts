import { getDocSections, getDocsData } from '$lib/server/docs';

export const prerender = true;

export async function load() {
    const docsData = await getDocsData();

    return {
        sections: getDocSections(docsData),
    };
}
