import { App } from '@omujs/omu';
import { BROWSER, DEV } from 'esm-env';
import { omu } from '../client.js';
import { APP as archive } from './archive/app.js';
import { APP as caption } from './caption/app.js';
import { APP as emoji } from './emoji/app.js';
import { APP as lipsynctest } from './lipsynctest/app.js';
import { APP as onecomme } from './onecomme/app.js';
import { APP as playqueue } from './playqueue/app.js';
import { APP as reaction } from './reaction/app.js';
import { APP as replay } from './replay/app.js';
import { APP as tester } from './tester/app.js';
import { APP as translator } from './translator/app.js';
import { APP as chatSubtitle } from './chatsubtitle/app.js';
import { APP as fries } from './aoikuru-fries/app.js';
import { APP as timer } from './timer/app.js';
import { APP as marshmallow } from './marshmallow/app.js';
import { APP as roulette } from './roulette/app.js';

export const apps = [
    archive,
    caption,
    emoji,
    lipsynctest,
    onecomme,
    playqueue,
    reaction,
    replay,
    tester,
    translator,
    chatSubtitle,
    timer,
    marshmallow,
    roulette,
] satisfies App[];

const personalApps: Record<string, App[]> = {
    aoikuru: [fries],
};

if (BROWSER) {
    const pass = BROWSER && new URL(window.location.href).searchParams.get('pass');
    if (pass && pass in personalApps) {
        apps.unshift(...personalApps[pass]);
    }
}

if (DEV && BROWSER) {
    apps.forEach((app) => {
        const origin = 'http://localhost:5173';
        if (!app.metadata) return;
        const icon = app.metadata?.icon;
        if (typeof icon !== 'string') return;
        if (icon.startsWith('ti-')) return;
        const url = new URL(icon, origin);
        app.metadata.icon = url.href;
    });
}

export const appTable = omu.dashboard.apps;
omu.onReady(async () => {
    console.log(await appTable.fetchAll());
});
