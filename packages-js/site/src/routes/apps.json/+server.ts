import { App } from '@omujs/omu';
import { json } from '@sveltejs/kit';
import { apps } from '../app/apps';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
    return json({
        id: 'com.omuapps:apps',
        apps: Object.fromEntries(apps.map((app) => [app.id.key(), App.serialize(app)])),
    });
};
