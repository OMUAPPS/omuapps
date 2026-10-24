import { App, Identifier, type IntoId, Omu } from '@omujs/omu';
import type { DashboardHandler, PromptResult } from '@omujs/omu/api/dashboard';

import type { TestServer } from './test-server.js';

export class AcceptingDashboard implements DashboardHandler {
    public readonly prompts: string[] = [];

    public async handlePermissionRequest(): Promise<PromptResult> {
        this.prompts.push('app/permissions');
        return 'accept';
    }

    public async handlePluginRequest(): Promise<PromptResult> {
        this.prompts.push('app/plugins');
        return 'accept';
    }

    public async handleInstallApp(): Promise<PromptResult> {
        this.prompts.push('app/install');
        return 'accept';
    }

    public async handleUpdateApp(): Promise<PromptResult> {
        this.prompts.push('app/update');
        return 'accept';
    }

    public async handleIndexInstall(): Promise<PromptResult> {
        this.prompts.push('index/install');
        return 'accept';
    }

    public async handleHttpPortRequest(): Promise<PromptResult> {
        this.prompts.push('http/port');
        return 'accept';
    }

    public async handleOpenApp(): Promise<void> {}

    public async handleDragDropRequest(): Promise<boolean> {
        return false;
    }

    public handleDragDropReadRequest(): never {
        throw new Error('Not supported in tests');
    }

    public async handleHostRequest(): Promise<PromptResult> {
        return 'deny';
    }

    public async openApp(): Promise<void> {}

    public getCookies(): never {
        throw new Error('Not supported in tests');
    }

    public createWebview(): never {
        throw new Error('Not supported in tests');
    }

    public async getWebview(): Promise<undefined> {
        return;
    }

    public async closeWebview(): Promise<undefined> {
        return;
    }

    public speechRecognitionStart(): never {
        throw new Error('Not supported in tests');
    }

    public async closeApp(): Promise<void> {}
}

export class TestClients {
    public static readonly DASHBOARD_APP: App = new App('com.omuapps:dashboard', { type: 'dashboard', version: '0.0.0' });

    private readonly clients: Omu[] = [];
    private dashboardClient: Omu | undefined;
    public readonly dashboard: AcceptingDashboard = new AcceptingDashboard();

    public constructor(private readonly server: TestServer) {}

    public async connectDashboard(): Promise<Omu> {
        const omu = this.create(TestClients.DASHBOARD_APP, this.server.token);
        omu.dashboard.set(this.dashboard);
        await this.start(omu);
        this.dashboardClient = omu;
        return omu;
    }

    public async tokenFor(app: App, permissions: IntoId[] = []): Promise<string> {
        const dashboard = this.dashboardClient ?? await this.connectDashboard();
        const { token } = await dashboard.sessions.generateToken({ app, permissions });
        return token;
    }

    public async connect(app: App, setup: (omu: Omu) => void = () => {}, permissions: IntoId[] = []): Promise<Omu> {
        const omu = this.create(app, await this.tokenFor(app, permissions));
        setup(omu);
        await this.start(omu);
        return omu;
    }

    public create(app: App, token: string): Omu {
        const omu = new Omu(app, {
            address: { host: '127.0.0.1', port: this.server.port, secure: false },
            token,
        });
        this.clients.push(omu);
        return omu;
    }

    public async start(omu: Omu): Promise<void> {
        const started = omu.start().catch(() => undefined);
        await Promise.race([
            omu.waitForReady(),
            started.then(() => {
                throw new Error(`Client ${omu.app.id.key()} stopped before ready: ${omu.network.reason?.message}`);
            }),
        ]);
    }

    public stop(): void {
        for (const omu of this.clients.splice(0)) {
            omu.stop();
        }
        this.dashboardClient = undefined;
    }

    public static app(name: string): App {
        return new App(new Identifier('com.example', name), { version: '1.0.0' });
    }
}
