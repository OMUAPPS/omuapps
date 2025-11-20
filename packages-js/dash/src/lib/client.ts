import { Dashboard } from './dashboard.js';

import type { Address } from '@omujs/omu/network';

import { invoke, IS_TAURI } from '$lib/tauri.js';

import { Chat, ChatPermissions } from '@omujs/chat';
import { App, Identifier, Omu, OmuPermissions } from '@omujs/omu';
import type { Locale } from '@omujs/omu/localization';
import type { SessioTokenProvider } from '../../../omu/dist/dts/token.js';
import { currentPage, language } from './main/settings.js';
import { VERSION } from './version.js';

const IDENTIFIER = new Identifier('com.omuapps', 'dashboard');
const app = new App(IDENTIFIER, {
    version: VERSION,
    type: 'dashboard',
});

const address: Address = {
    host: window.location.hostname,
    port: 26423,
    secure: false,
};

class DashboardSession implements SessioTokenProvider {
    async get(): Promise<string | undefined> {
        if (IS_TAURI) {
            const token = await invoke('get_token');
            if (token) {
                return token;
            }
        }
    }
}

const omu = new Omu(app, {
    address,
    token: new DashboardSession(),
});
const chat = Chat.create(omu);
const dashboard = new Dashboard(omu);
omu.plugins.require({
    omu_chat: `>=${VERSION}`,
    omu_chat_youtube: `>=${VERSION}`,
    omu_chat_twitch: `>=${VERSION}`,
    omu_chatprovider: `>=${VERSION}`,
});
omu.permissions.require(
    ChatPermissions.CHAT_CHANNEL_TREE_PERMISSION_ID,
    OmuPermissions.TABLE_PERMISSION_ID,
    OmuPermissions.PLUGIN_READ_PACKAGE_PERMISSION_ID,
    OmuPermissions.PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
    OmuPermissions.SERVER_SHUTDOWN_PERMISSION_ID,
    OmuPermissions.DASHBOARD_OPEN_APP_PERMISSION_ID,
    OmuPermissions.DAShBOARD_DRAG_DROP_PERMISSION_ID,
    OmuPermissions.ASSET_PERMISSION_ID,
    OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
    OmuPermissions.I18N_SET_LOCALES_PERMISSION_ID,
);

omu.onReady(() => {
    language.subscribe((lang) => {
        omu.i18n.setLocale([lang] as Locale[]);
    });
});

export { chat, dashboard, omu };

currentPage.subscribe(() => {
    dashboard.currentApp = null;
});
