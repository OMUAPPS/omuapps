export { AppIndexRegistry, type AppIndexRegistryJSON } from './api/server';
export { App, type AppMetadata } from './app.js';
export { DisconnectReason } from './errors.js';
export { Identifier, IdentifierMap, IdentifierSet, type IntoId } from './identifier';
export * as network from './network';
export { Omu } from './omu.js';
export { Serializer } from './serialize';
export type { Serializable } from './serialize';
export { BrowserSession, type SessionParam, type SessioTokenProvider } from './token';

import { ASSET_PERMISSION_ID } from './api/asset';
import {
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DAShBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
} from './api/dashboard';
import { HTTP_REQUEST_PERMISSION_ID } from './api/http';
import { I18N_GET_LOCALES_PERMISSION_ID, I18N_SET_LOCALES_PERMISSION_ID } from './api/i18n';
import { LOGGER_LOG_PERMISSION_ID } from './api/logger';
import { PLUGIN_MANAGE_PACKAGE_PERMISSION_ID, PLUGIN_READ_PACKAGE_PERMISSION_ID } from './api/plugin';
import { REGISTRY_PERMISSION_ID } from './api/registry';
import { SERVER_APPS_READ_PERMISSION_ID, SERVER_SHUTDOWN_PERMISSION_ID, TRUSTED_ORIGINS_GET_PERMISSION_ID, TRUSTED_ORIGINS_SET_PERMISSION_ID } from './api/server';
import { GENERATE_TOKEN_PERMISSION_ID, REMOTE_APP_REQUEST_PERMISSION_ID, SESSIONS_READ_PERMISSION_ID } from './api/session';
import { TABLE_PERMISSION_ID } from './api/table';
import { Identifier } from './identifier';

export const OmuPermissions: {
    // Asset API
    readonly ASSET_PERMISSION_ID: Identifier;
    // Dashboard API
    readonly DASHBOARD_APP_INSTALL_PERMISSION_ID: Identifier; readonly DAShBOARD_DRAG_DROP_PERMISSION_ID: Identifier; readonly DASHBOARD_OPEN_APP_PERMISSION_ID: Identifier; readonly DASHBOARD_SET_PERMISSION_ID: Identifier; readonly DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID: Identifier; readonly DASHBOARD_WEBVIEW_PERMISSION_ID: Identifier; readonly DASHOBARD_APP_EDIT_PERMISSION_ID: Identifier; readonly DASHOBARD_APP_READ_PERMISSION_ID: Identifier;
    // HTTP API
    readonly HTTP_REQUEST_PERMISSION_ID: Identifier;
    // I18n API
    readonly I18N_GET_LOCALES_PERMISSION_ID: Identifier; readonly I18N_SET_LOCALES_PERMISSION_ID: Identifier;
    // Logger API
    readonly LOGGER_LOG_PERMISSION_ID: Identifier;
    // Plugin API
    readonly PLUGIN_MANAGE_PACKAGE_PERMISSION_ID: Identifier; readonly PLUGIN_READ_PACKAGE_PERMISSION_ID: Identifier;
    // Registry API
    readonly REGISTRY_PERMISSION_ID: Identifier;
    // Server API
    readonly SERVER_APPS_READ_PERMISSION_ID: Identifier; readonly SERVER_SHUTDOWN_PERMISSION_ID: Identifier; readonly TRUSTED_ORIGINS_GET_PERMISSION_ID: Identifier; readonly TRUSTED_ORIGINS_SET_PERMISSION_ID: Identifier;
    // Session API
    readonly GENERATE_TOKEN_PERMISSION_ID: Identifier; readonly REMOTE_APP_REQUEST_PERMISSION_ID: Identifier; readonly SESSIONS_READ_PERMISSION_ID: Identifier;
    // Table API
    readonly TABLE_PERMISSION_ID: Identifier;
} = {
    // Asset API
    ASSET_PERMISSION_ID: ASSET_PERMISSION_ID,
    // Dashboard API
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DAShBOARD_DRAG_DROP_PERMISSION_ID,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_SET_PERMISSION_ID,
    DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
    DASHBOARD_WEBVIEW_PERMISSION_ID,
    DASHOBARD_APP_EDIT_PERMISSION_ID,
    DASHOBARD_APP_READ_PERMISSION_ID,
    // HTTP API
    HTTP_REQUEST_PERMISSION_ID,
    // I18n API
    I18N_GET_LOCALES_PERMISSION_ID,
    I18N_SET_LOCALES_PERMISSION_ID,
    // Logger API
    LOGGER_LOG_PERMISSION_ID,
    // Plugin API
    PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
    PLUGIN_READ_PACKAGE_PERMISSION_ID,
    // Registry API
    REGISTRY_PERMISSION_ID,
    // Server API
    SERVER_APPS_READ_PERMISSION_ID,
    SERVER_SHUTDOWN_PERMISSION_ID,
    TRUSTED_ORIGINS_GET_PERMISSION_ID,
    TRUSTED_ORIGINS_SET_PERMISSION_ID,
    // Session API
    GENERATE_TOKEN_PERMISSION_ID,
    REMOTE_APP_REQUEST_PERMISSION_ID,
    SESSIONS_READ_PERMISSION_ID,
    // Table API
    TABLE_PERMISSION_ID,
} as const;
