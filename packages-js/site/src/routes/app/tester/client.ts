import { Chat } from '@omujs/chat';
import { Omu } from '@omujs/omu';
import { setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { APP } from './app.js';

export const omu = new Omu(APP);
export const chat = Chat.create(omu);
setClient(omu);

if (BROWSER) {
    omu.start();
}
