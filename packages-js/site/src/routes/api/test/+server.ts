import TypeOrm from '$lib/db.js';
import { I18n, Translation } from '$lib/entities/i18n.js';
import { LOCALES } from '$lib/entities/locale.js';
import { Tag, TagMetadata } from '$lib/entities/tag.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
    const db = await TypeOrm.getDb();
    const tagmetadata = new TagMetadata();
    const name = I18n.builder().set(LOCALES['ja-JP'], 'test').build();
    tagmetadata.i18n = name;
    const tag = new Tag();
    tag.metadata = tagmetadata;
    const translationRepository = db.manager.getRepository(Translation);
    await translationRepository.save(name.translations);
    const i18nRepository = db.manager.getRepository(I18n);
    await i18nRepository.save(name);
    const metadataRepository = db.manager.getRepository(TagMetadata);
    await metadataRepository.save(tagmetadata);
    const tagRepository = db.manager.getRepository(Tag);
    await tagRepository.save(tag);

    return json(tag);
};
