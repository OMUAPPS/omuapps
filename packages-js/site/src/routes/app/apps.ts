import { App } from '@omujs/omu';
import { BROWSER, DEV } from 'esm-env';
import { omu } from '../client.js';
import { APP as fries } from './aoikuru-fries/app.js';
import { APP as archive } from './archive/app.js';
import { APP as breaktimer } from './break-timer/app.js';
import { APP as caption } from './caption/app.js';
import { APP as chatSubtitle } from './chatsubtitle/app.js';
import { APP as emoji } from './emoji/app.js';
import { APP as lipsynctest } from './lipsynctest/app.js';
import { APP as marshmallow } from './marshmallow/app.js';
import { APP as obssync } from './obs-sync/app.js';
import { APP as playqueue } from './playqueue/app.js';
import { APP as reaction } from './reaction/app.js';
import { APP as replay } from './replay/app.js';
import { APP as roulette } from './roulette/app.js';
import { APP as tester } from './tester/app.js';
import { APP as timer } from './timer/app.js';
import { APP as translator } from './translator/app.js';

export const apps = [
    reaction,
    replay,
    marshmallow,
    timer,
    roulette,
] satisfies App[];

if (DEV) {
    apps.unshift(
        caption,
        emoji,
        lipsynctest,
        playqueue,
        tester,
        translator,
        chatSubtitle,
        obssync,
        breaktimer,
        archive,
    )
}

const personalApps: Record<string, App[]> = {
    aoikuru: [fries],
};

if (BROWSER) {
    const pass = new URL(window.location.href).searchParams.get('pass');
    if (pass && pass in personalApps) {
        apps.unshift(...personalApps[pass]);
    }
}

export const appTable = omu.dashboard.apps;
omu.onReady(() => appTable.fetchAll());
