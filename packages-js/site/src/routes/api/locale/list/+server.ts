import TypeOrm from '$lib/db.js';
import { Locale } from '$lib/entities/locale.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
    const db = await TypeOrm.getDb();
    const localeRepository = db.manager.getRepository(Locale);
    const locales = await localeRepository.find();
    return json(locales);
};
