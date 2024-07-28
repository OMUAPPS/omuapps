import TypeOrm from '$lib/db.js';
import { Tag } from '$lib/entities/tag.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
    const db = await TypeOrm.getDb();
    const tagRepository = db.manager.getRepository(Tag);
    const tags = await tagRepository.find({
        relations: {
            metadata: {
                i18n: {
                    translations: true,
                },
            },
        },
    });
    return json(tags);
};
