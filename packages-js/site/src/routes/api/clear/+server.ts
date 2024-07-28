import TypeOrm from '$lib/db.js';
import { Locale, LOCALES } from '$lib/entities/locale.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
    const db = await TypeOrm.getDb();
    await db.dropDatabase();
    await db.synchronize();

    const localeRepository = db.getRepository(Locale);
    localeRepository.save(Object.values(LOCALES));

    return json({ success: true });
};
