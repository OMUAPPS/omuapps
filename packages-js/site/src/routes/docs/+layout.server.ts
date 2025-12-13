import { getDocSections, getDocsData } from './server';

export const prerender = true;

export async function load() {
    const docsData = await getDocsData();

    return {
        sections: getDocSections(docsData),
    };
}
