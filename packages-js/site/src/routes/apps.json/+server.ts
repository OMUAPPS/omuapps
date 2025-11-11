import { App, Identifier } from '@omujs/omu';
import { json } from '@sveltejs/kit';
import { apps } from '../app/apps';
import { NAMESPACE } from '../app/origin';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
    return json({
        id: new Identifier(NAMESPACE, 'apps'),
        apps: Object.fromEntries(apps.map((app) => [app.id.key(), App.serialize(app)])),
    });
};
