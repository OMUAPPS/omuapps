import { getDocSections, getDocsData } from './docs-data';

export const prerender = true;

export async function load() {
    const docsData = await getDocsData();

    return {
        sections: getDocSections(docsData),
    };
}
