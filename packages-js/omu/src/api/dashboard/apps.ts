import { App } from '../../app';
import { Identifier, IntoId } from '../../identifier';
import { Omu } from '../../omu';
import { Serializer } from '../../serialize';
import { EndpointType } from '../endpoint';
import { Table, TableType } from '../table';
import { DASHBOARD_EXTENSION_TYPE } from './constants';
import { DashboardHandler } from './handler';
import { AppInstallResponse } from './packets';

export const DASHBOARD_OPEN_APP_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'open');
export const DASHBOARD_APP_INSTALL_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'install');
export const DASHBOARD_APP_CLOSE_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'close');
export const DASHBOARD_APP_STARTUP_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('app', 'startup');

const ENDPOINT_OPEN = EndpointType.createJson<App, void>(DASHBOARD_EXTENSION_TYPE, {
    name: 'open_app',
    requestSerializer: App,
    permissionId: DASHBOARD_OPEN_APP_PERMISSION_ID,
});
const ENDPOINT_INSTALL = EndpointType.createJson<App, AppInstallResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'install_app',
    requestSerializer: App,
    permissionId: DASHBOARD_APP_INSTALL_PERMISSION_ID,
});
const ENDPOINT_CLOSE = EndpointType.createJson<Identifier, null>(DASHBOARD_EXTENSION_TYPE, {
    name: 'close_app',
    requestSerializer: Identifier,
    permissionId: DASHBOARD_APP_INSTALL_PERMISSION_ID,
});
interface RequestStartup {
    type: 'register' | 'unregister';
    app: Identifier;
}
const ENDPOINT_REQUEST_STARTUP = EndpointType.createJson<RequestStartup, null>(DASHBOARD_EXTENSION_TYPE, {
    name: 'request_startup',
    requestSerializer: Serializer.noop<RequestStartup>()
        .field('app', Identifier),
    permissionId: DASHBOARD_APP_STARTUP_PERMISSION_ID,
});

interface StartupApp {
    id: string;
}

const STARTUP_APPS = TableType.createJson<StartupApp>(DASHBOARD_EXTENSION_TYPE, {
    name: 'startup_apps',
    key: ({ id }) => id,
});

export class DashboardApps {
    private readonly startupApps: Table<StartupApp>;

    constructor(
        private readonly omu: Omu,
    ) {
        this.startupApps = omu.tables.get(STARTUP_APPS);
    }

    public setDashboard(dashboard: DashboardHandler): void {
        this.omu.endpoints.bind(ENDPOINT_CLOSE, async (id) => {
            await dashboard.closeApp(id);
        });
        this.omu.endpoints.bind(ENDPOINT_REQUEST_STARTUP, async (request, params) => {
            if (!params.caller.isSubpathOf(request.app)) {
                throw new Error(`App ${params.caller} cannot request startup for app ${request.app}`);
            }
            if (request.type === 'register') {
                await this.startupApps.add({
                    id: request.app.key(),
                });
            } else if (request.type === 'unregister') {
                await this.startupApps.remove({
                    id: request.app.key(),
                });
            }
            return null;
        });
        this.omu.onReady(async () => {
            const startupApps = await this.startupApps.fetchAll();
            const ids = [...startupApps.values()].map(({ id }) => id);
            const apps = await this.omu.server.apps.getMany(...ids);
            await dashboard.openApp(...apps.values());
        });
    }

    public async open(app: App): Promise<void> {
        return await this.omu.endpoints.call(ENDPOINT_OPEN, app);
    }

    public async install(app: App): Promise<AppInstallResponse> {
        return await this.omu.endpoints.call(ENDPOINT_INSTALL, app);
    }

    public async close(app: IntoId): Promise<void> {
        await this.omu.endpoints.call(ENDPOINT_CLOSE, Identifier.from(app));
    }

    public async addStartup(app: IntoId): Promise<void> {
        await this.omu.endpoints.call(ENDPOINT_REQUEST_STARTUP, {
            type: 'register',
            app: Identifier.from(app),
        });
    }

    public async removeStartup(app: IntoId): Promise<void> {
        await this.omu.endpoints.call(ENDPOINT_REQUEST_STARTUP, {
            type: 'unregister',
            app: Identifier.from(app),
        });
    }

    public async getStartupApps(): Promise<Map<string, StartupApp>> {
        const startupApps = await this.startupApps.fetchAll();
        return startupApps;
    }
}
