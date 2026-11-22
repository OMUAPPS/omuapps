import { App, PermissionDenied } from '@omujs/omu';
import {
    DASHBOARD_ALLOWED_WEBVIEW_HOSTS,
    DASHBOARD_APP_INSTALL_ENDPOINT,
    DASHBOARD_APP_INSTALL_PERMISSION_ID,
    DASHBOARD_DRAG_DROP_READ_ENDPOINT,
    DASHBOARD_DRAG_DROP_STATE_PACKET,
    DASHBOARD_OPEN_APP_ENDPOINT,
    DASHBOARD_OPEN_APP_PACKET,
    DASHBOARD_OPEN_APP_PERMISSION_ID,
    DASHBOARD_PROMPT_CLEAR_BLOCKED,
    DASHBOARD_PROMPT_REQUEST,
    DASHBOARD_PROMPT_RESPONSE,
    DASHBOARD_SET_ENDPOINT,
    DASHBOARD_SPEECH_RECOGNITION,
    DASHBOARD_STARTUP_APPS,
    DASHBOARD_WEBVIEW_EVENT_PACKET,
    type AppInstallResponse,
    type FileDragPacket,
    type PortProcess,
    type PromptRequest,
    type PromptResponse,
    type PromptResult,
    type WebviewEventPacket,
} from '@omujs/omu/api/dashboard';
import { PermissionType } from '@omujs/omu/api/permission';
import type { AppIndexRegistryMeta } from '@omujs/omu/api/server';

import type { AppUpdateApproval, PermissionManager } from '../../security';
import type { PacketDispatcher, Session } from '../../session';
import { SystemProcesses } from '../../system';
import type { EndpointExtension } from '../endpoint';
import type { RegistryExtension } from '../registry';
import type { SessionExtension } from '../session';
import type { TableExtension, TypedTable } from '../table';

import type { AppIndexes } from './app-indexes.js';
import { DashboardPermissions } from './dashboard-permissions.js';

type PendingPrompt = {
    kind: string;
    result: Promise<PromptResult>;
    resolve: (result: PromptResult) => void;
};

export class DashboardExtension implements AppUpdateApproval {
    private dashboard: Session | undefined;
    private readonly dashboardWaiters: Array<(session: Session) => void> = [];
    private readonly prompts = new Map<string, PendingPrompt>();
    private readonly promptKeys = new Map<string, PendingPrompt>();
    private readonly blockedPrompts = new Set<string>();
    private requestId = 0;

    public constructor(
        dispatcher: PacketDispatcher,
        endpoints: EndpointExtension,
        tables: TableExtension,
        registries: RegistryExtension,
        private readonly security: PermissionManager,
        private readonly sessions: SessionExtension,
        private readonly apps: TypedTable<App>,
        private readonly indexes: AppIndexes,
    ) {
        security.registerPermission(...DashboardPermissions.ALL);
        security.setUpdateApproval(this);
        dispatcher.register(
            DASHBOARD_DRAG_DROP_STATE_PACKET,
            DASHBOARD_WEBVIEW_EVENT_PACKET,
            DASHBOARD_PROMPT_REQUEST,
            DASHBOARD_PROMPT_RESPONSE,
            DASHBOARD_OPEN_APP_PACKET,
        );
        dispatcher.bind(DASHBOARD_DRAG_DROP_STATE_PACKET, (session, packet) => this.handleDragDropState(session, packet));
        dispatcher.bind(DASHBOARD_WEBVIEW_EVENT_PACKET, (session, packet) => this.handleWebviewEvent(session, packet));
        dispatcher.bind(DASHBOARD_PROMPT_RESPONSE, (session, response) => this.handlePromptResponse(session, response));
        endpoints.bind(DASHBOARD_PROMPT_CLEAR_BLOCKED, () => {
            this.blockedPrompts.clear();
            return null;
        });
        endpoints.bind(DASHBOARD_SET_ENDPOINT, (session) => this.handleSet(session));
        endpoints.bind(DASHBOARD_OPEN_APP_ENDPOINT, (session, app) => this.handleOpenApp(session, app));
        endpoints.bind(DASHBOARD_APP_INSTALL_ENDPOINT, (session, app) => this.handleInstall(session, app));
        endpoints.bind(DASHBOARD_DRAG_DROP_READ_ENDPOINT, () => {
            throw new Error('Not implemented');
        });
        tables.register(DASHBOARD_STARTUP_APPS);
        tables.register(DASHBOARD_ALLOWED_WEBVIEW_HOSTS);
        registries.register(DASHBOARD_SPEECH_RECOGNITION);
    }

    public async approve(previous: App, next: App): Promise<boolean> {
        const dependencies = await this.indexes.resolveDependencies(next);
        const accepted = await this.requestUpdate(previous, next, dependencies);
        if (accepted) {
            await this.apps.add(...dependencies.values());
        }
        return accepted;
    }

    public async requestPermissions(app: App, permissions: PermissionType[]): Promise<boolean> {
        return this.requestPrompt(app.id.key(), {
            kind: 'app/permissions',
            id: this.nextRequestId(),
            app: App.serialize(app),
            permissions: permissions.map((permission) => PermissionType.serialize(permission)),
        });
    }

    public async requestIndexInstall(url: URL, meta: AppIndexRegistryMeta | undefined): Promise<boolean> {
        return this.requestPrompt(url.host, {
            kind: 'index/install',
            id: this.nextRequestId(),
            index_url: url.toString(),
            meta,
        });
    }

    public async requestHttpPort(app: App, port: number): Promise<boolean> {
        const processes: PortProcess[] = (await SystemProcesses.table.listeningOn(port))
            .map((process) => ({ name: process.name, exe: process.exe, port }));
        if (processes.length === 0) return false;
        return this.requestPrompt(`${app.id.key()}-${port}`, {
            kind: 'http/port',
            id: this.nextRequestId(),
            app: App.serialize(app),
            processes,
        });
    }

    private async handleInstall(session: Session, app: App): Promise<AppInstallResponse> {
        session.permissions.require(DASHBOARD_APP_INSTALL_PERMISSION_ID, 'Session does not have permission to install apps');
        const dependencies = await this.indexes.resolveDependencies(app);
        if (app.type === 'service' && dependencies.size > 0) throw new Error('Service apps cannot have dependencies');
        const existing = this.security.entry(app.id);
        const accepted = existing
            ? await this.requestUpdate(existing.app, app, dependencies)
            : await this.requestInstall(app, dependencies);
        if (accepted) {
            await this.apps.add(app, ...dependencies.values());
        }
        return { accepted };
    }

    private async handleSet(session: Session): Promise<{ success: boolean }> {
        if (!session.role.managesDashboard) throw new PermissionDenied('Session is not a dashboard');
        this.dashboard = session;
        session.disconnected.listen(() => {
            if (this.dashboard !== session) return;
            this.dashboard = undefined;
            this.promptKeys.clear();
        });
        for (const resolve of this.dashboardWaiters.splice(0)) {
            resolve(session);
        }
        return { success: true };
    }

    private async handleOpenApp(session: Session, app: App): Promise<void> {
        if (!this.dashboard) throw new Error('Dashboard session not set');
        session.permissions.require(DASHBOARD_OPEN_APP_PERMISSION_ID, 'Session does not have permission to open apps');
        await this.dashboard.send(DASHBOARD_OPEN_APP_PACKET, app);
    }

    private async handlePromptResponse(session: Session, response: PromptResponse): Promise<void> {
        this.requireDashboard(session);
        const prompt = this.prompts.get(response.id);
        if (!prompt) throw new Error(`Dashboard request with id ${response.id} does not exist`);
        this.prompts.delete(response.id);
        if (prompt.kind !== response.kind) {
            throw new Error(`The kind of Dashboard request with id ${response.id} does not match ${response.kind} != ${prompt.kind}`);
        }
        prompt.resolve(response.result);
    }

    private async handleDragDropState(session: Session, packet: FileDragPacket): Promise<void> {
        this.requireDashboard(session);
        const target = this.sessions.find(packet.app.id);
        if (!target) throw new Error(`Session ${packet.app.id.key()} not found`);
        await target.send(DASHBOARD_DRAG_DROP_STATE_PACKET, packet);
    }

    private async handleWebviewEvent(session: Session, packet: WebviewEventPacket): Promise<void> {
        this.requireDashboard(session);
        const target = this.sessions.find(packet.target);
        if (!target) return;
        await target.send(DASHBOARD_WEBVIEW_EVENT_PACKET, packet);
    }

    private async requestInstall(app: App, dependencies: Map<string, App>): Promise<boolean> {
        return this.requestPrompt(app.id.key(), {
            kind: 'app/install',
            id: this.nextRequestId(),
            app: App.serialize(app),
            dependencies: DashboardExtension.serialize(dependencies),
        });
    }

    private async requestUpdate(previous: App, next: App, dependencies: Map<string, App>): Promise<boolean> {
        return this.requestPrompt(previous.id.key(), {
            kind: 'app/update',
            id: this.nextRequestId(),
            old_app: App.serialize(previous),
            new_app: App.serialize(next),
            dependencies: DashboardExtension.serialize(dependencies),
        });
    }

    private async requestPrompt(key: string, request: PromptRequest): Promise<boolean> {
        const promptKey = `${request.kind}-${key}`;
        if (this.blockedPrompts.has(promptKey)) return false;
        const existing = this.promptKeys.get(promptKey);
        if (existing) return await existing.result === 'accept';
        let resolve: (result: PromptResult) => void = () => {};
        const result = new Promise<PromptResult>((done) => {
            resolve = done;
        });
        const prompt: PendingPrompt = { kind: request.kind, result, resolve };
        this.prompts.set(request.id, prompt);
        this.promptKeys.set(promptKey, prompt);
        try {
            const dashboard = await this.waitDashboard();
            await dashboard.send(DASHBOARD_PROMPT_REQUEST, request);
            const answer = await result;
            if (answer === 'block') {
                this.blockedPrompts.add(promptKey);
            }
            return answer === 'accept';
        } finally {
            this.prompts.delete(request.id);
            this.promptKeys.delete(promptKey);
        }
    }

    private async waitDashboard(): Promise<Session> {
        if (this.dashboard) return this.dashboard;
        return new Promise((resolve) => this.dashboardWaiters.push(resolve));
    }

    private requireDashboard(session: Session): void {
        if (session === this.dashboard) return;
        throw new PermissionDenied(`Session ${session.app.id.key()} is not the dashboard session`);
    }

    private nextRequestId(): string {
        this.requestId += 1;
        return `${this.requestId}-${process.hrtime.bigint()}`;
    }

    private static serialize(apps: Map<string, App>): Record<string, ReturnType<typeof App.serialize>> {
        return Object.fromEntries([...apps].map(([key, app]) => [key, App.serialize(app)]));
    }
}
