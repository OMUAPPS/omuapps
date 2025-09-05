import { VERSION } from '$lib/version.js';
import { App, Identifier, Omu } from '@omujs/omu';
import {
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
} from '@omujs/omu/api/dashboard';
import { setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { NAMESPACE } from './app/origin.js';

export const APP = new Identifier(NAMESPACE, 'page');
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
    DASHOBARD_APP_READ_PERMISSION_ID,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
);

if (BROWSER) {
    omu.start();
}
