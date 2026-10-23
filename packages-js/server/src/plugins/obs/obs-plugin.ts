import { existsSync } from 'node:fs';
import path from 'node:path';

import { PLUGIN_ID } from '@omujs/obs/const.js';
import { CHECK_INSTALLED, type InstallationStatus, type InstallRequest, SET_INSTALL } from '@omujs/obs/types.js';
import { App, OmuPermissions, VERSION } from '@omujs/omu';

import type { ServerPlugin, ServerPluginContext } from '../../api';
import { SystemProcesses } from '../../system';

import { ObsFiles } from './obs-files.js';
import type { ObsInstallation } from './obs-installation.js';
import { ObsLegacyScript } from './obs-legacy-script.js';
import { ObsPermissions } from './obs-permissions.js';

export class ObsPlugin implements ServerPlugin {
    public static readonly APP: App = new App(PLUGIN_ID, {
        version: VERSION,
        metadata: {
            locale: 'en',
            name: { ja: 'OBSプラグイン', en: 'OBS Plugin' },
            description: { ja: 'アプリがOBSを制御するためのプラグイン', en: 'Plugin for app to control OBS' },
        },
    });

    public readonly packageNames: readonly string[] = ['omuplugin_obs'];

    public constructor(
        private readonly context: ServerPluginContext,
        private readonly installation: ObsInstallation,
    ) {
        context.security.registerPermission(...ObsPermissions.ALL);
        context.endpoints.bind(CHECK_INSTALLED, () => this.status());
        context.endpoints.bind(SET_INSTALL, (_, request) => this.setInstall(request));
    }

    public async start(): Promise<void> {
        const config = ObsFiles.readConfig();
        delete config.python_path;
        config.log_path = path.resolve(this.context.root, 'logs').split(path.sep).join('/');
        config.server = this.context.address;
        ObsFiles.writeConfig(config);
        const { handle, token } = this.context.security.generateAppToken(ObsPlugin.APP);
        handle.grantAll([
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.TABLE_PERMISSION_ID,
            OmuPermissions.LOGGER_LOG_PERMISSION_ID,
        ]);
        ObsFiles.storeToken(this.context.address, ObsPlugin.APP, token);
        await this.removeLegacyScript();
    }

    public async stop(): Promise<void> {}

    public async uninstall(): Promise<void> {
        this.context.security.removeApp(ObsPlugin.APP.id);
        ObsFiles.remove();
    }

    private async removeLegacyScript(): Promise<void> {
        if (await SystemProcesses.table.isRunning(this.installation.processNames)) {
            console.info('OBS is running; legacy script will be removed on next start');
            return;
        }
        new ObsLegacyScript(this.installation).remove();
    }

    private status(): InstallationStatus {
        return {
            script_installed: existsSync(this.installation.pluginDirectory),
            launch_installed: Boolean(ObsFiles.readConfig().launch),
        };
    }

    private setInstall(request: InstallRequest): null {
        const config = ObsFiles.readConfig();
        if (!request.launch_active) {
            delete config.launch;
            ObsFiles.writeConfig(config);
            return null;
        }
        const dashboard = this.context.dashboardPath;
        if (!dashboard) return null;
        config.launch = {
            cwd: path.resolve(this.context.root).split(path.sep).join('/'),
            args: [path.resolve(dashboard).split(path.sep).join('/'), '--background'],
        };
        ObsFiles.writeConfig(config);
        return null;
    }
}
