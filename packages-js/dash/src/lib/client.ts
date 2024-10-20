import { setChat, setClient } from '@omujs/ui';
import { Dashboard } from './dashboard.js';

import type { Address } from '@omujs/omu/address.js';

import { invoke, IS_TAURI } from '$lib/tauri.js';

import { Chat } from '@omujs/chat';
import { CHAT_CHANNEL_TREE_PERMISSION_ID } from '@omujs/chat/permissions.js';
import { App, Omu } from '@omujs/omu';
import {
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
} from '@omujs/omu/extension/dashboard/index.js';
import {
    I18N_GET_LOCALES_PERMISSION_ID,
    I18N_SET_LOCALES_PERMISSION_ID,
} from '@omujs/omu/extension/i18n/index.js';
import {
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
} from '@omujs/omu/extension/server/index.js';
import { Identifier } from '@omujs/omu/identifier.js';
import type { Locale } from '@omujs/omu/localization/locale.js';
import { BrowserTokenProvider } from '@omujs/omu/token.js';
import { language } from './main/settings.js';
import { version } from './version.json';

const IDENTIFIER = new Identifier('com.omuapps', 'dashboard');
const app = new App(IDENTIFIER, {
    version,
    type: 'dashboard',
});

const address = {
    host: window.location.hostname,
    port: 26423,
    secure: false,
};

class TokenProvider extends BrowserTokenProvider {
    async get(serverAddress: Address, app: App): Promise<string | undefined> {
        if (IS_TAURI) {
            const token = await invoke('get_token');
            if (token) {
                return token;
            }
        }
        return super.get(serverAddress, app);
    }

    async set(serverAddress: Address, app: App, token: string): Promise<void> {
        return super.set(serverAddress, app, token);
    }
}

const omu = new Omu(app, {
    address,
    token: new TokenProvider('omu-token'),
});
const chat = Chat.create(omu);
const dashboard = new Dashboard(omu);
setClient(omu);
setChat(chat);
omu.plugins.require({
    omuplugin_chat: `==${version}`,
    omu_chat_youtube: `==${version}`,
    omu_chatprovider: `==${version}`,
});
omu.permissions.require(
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
    SERVER_APPS_READ_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    I18N_GET_LOCALES_PERMISSION_ID,
    I18N_SET_LOCALES_PERMISSION_ID,
);

omu.onReady(() => {
    language.subscribe((lang) => {
        omu.i18n.setLocale([lang] as Locale[]);
    });
})

export { chat, dashboard, omu };
