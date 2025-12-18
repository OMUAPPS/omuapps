import { App } from '@omujs/omu';
import { DEV } from 'esm-env';
import { omu } from '../client.js';
import { APP as breaktimer } from './break-timer/app.js';
import { APP as caption } from './caption/app.js';
import { CHAT_OVERLAY_APP } from './chat-overlay/app.js';
import { APP as chatSubtitle } from './chatsubtitle/app.js';
import { APP as clock } from './clock/app.js';
import { DISCORD_PLUGIN_APP, APP as discordOverlay } from './discord-overlay/app.js';
import { APP as lipsynctest } from './lipsynctest/app.js';
import { APP as marshmallow } from './marshmallow/app.js';
import { APP as omucafe } from './omucafe/app.js';
import { QUIZ_APP } from './quiz/app.js';
import { APP as reaction } from './reaction/app.js';
import { APP as remote } from './remote/app.js';
import { APP as replay } from './replay/app.js';
import { APP as roulette } from './roulette/app.js';
import { APP as tester } from './tester/app.js';
import { APP as timer } from './timer/app.js';
import { VIDEO_OVERLAY_APP } from './video-overlay/app.js';

export const apps = [
    discordOverlay,
    reaction,
    replay,
    marshmallow,
    timer,
    roulette,
    reaction,
    DISCORD_PLUGIN_APP,
    VIDEO_OVERLAY_APP,
    CHAT_OVERLAY_APP,
    clock,
    tester,
] satisfies App[];

if (DEV) {
    apps.unshift(
        caption,
        lipsynctest,
        chatSubtitle,
        breaktimer,
        remote,
        QUIZ_APP,
        omucafe,
    );
}

export const appTable = omu.server.apps;
omu.onReady(() => appTable.fetchAll());
