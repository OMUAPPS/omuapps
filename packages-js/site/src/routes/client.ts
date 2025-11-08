import { VERSION } from '$lib/version.js';
import { App, Identifier, Omu, OmuPermissions } from '@omujs/omu';
import { setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { NAMESPACE } from './app/origin.js';

export const APP = new Identifier(NAMESPACE, 'explore');
const app = new App(APP, {
    version: VERSION,
    metadata: {
        locale: 'en',
        name: {
            ja: 'アプリを探す',
            en: 'Find Apps',
        },
    },
});
export const omu = new Omu(app);
setClient(omu);
omu.permissions.require(
    OmuPermissions.DASHOBARD_APP_READ_PERMISSION_ID,
    OmuPermissions.DASHBOARD_APP_INSTALL_PERMISSION_ID,
    OmuPermissions.DASHBOARD_OPEN_APP_PERMISSION_ID,
    OmuPermissions.SERVER_APPS_READ_PERMISSION_ID,
);

if (BROWSER) {
    omu.start();
}
