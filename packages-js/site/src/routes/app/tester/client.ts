import { Chat } from '@omujs/chat';
import { Omu, OmuPermissions } from '@omujs/omu';
import { setGlobal } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { APP } from './app.js';

export const omu = new Omu(APP);
export const chat = Chat.create(omu);
setGlobal({ omu, chat });

if (BROWSER) {
    omu.permissions.require(
        OmuPermissions.ASSET_PERMISSION_ID,
    );
    omu.start();
}
