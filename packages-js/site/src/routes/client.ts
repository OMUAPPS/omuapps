import { App, Omu } from '@omujs/omu';
import {
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID
} from '@omujs/omu/extension/dashboard/dashboard-extension.js';
import { Identifier } from '@omujs/omu/identifier.js';
import { setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';

const identifier = new Identifier('com.omuapps', 'page');
const app = new App(identifier, {
    version: '1.0.0',
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
