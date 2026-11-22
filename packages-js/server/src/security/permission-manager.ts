import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { App, Identifier, IdentifierMap } from '@omujs/omu';
import { PermissionType, type PermissionTypeJson } from '@omujs/omu/api/permission';

import { AppEntry, type AppEntryJSON } from './app-entry.js';
import { AppToken } from './app-token.js';
import { AppPermissionHandle, type AppEntrySource, ChildPermissionHandle, FullPermissionHandle, type PermissionHandle } from './permission-handle.js';

export type AppVerification = {
    ok: true;
    handle: PermissionHandle;
    token: string;
} | {
    ok: false;
    reason: string;
};

export interface AppUpdateApproval {
    approve(previous: App, next: App): Promise<boolean>;
}

export class PermissionManager implements AppEntrySource {
    private readonly frameTokens = new Map<string, string>();
    private readonly pluginTokens = new Set<string>();
    private approval: AppUpdateApproval | undefined;

    private constructor(
        private readonly directory: string,
        private readonly dashboardToken: string | undefined,
        private readonly apps: Map<string, AppEntry>,
        public readonly permissions: IdentifierMap<PermissionType>,
    ) {}

    public static load(directory: string, dashboardToken: string | undefined): PermissionManager {
        const appsJson = PermissionManager.read<Record<string, AppEntryJSON>>(path.join(directory, 'apps.json'));
        const permissionsJson = PermissionManager.read<Record<string, PermissionTypeJson>>(path.join(directory, 'permissions.json'));
        const apps = new Map(Object.entries(appsJson).map(([key, json]) => [key, AppEntry.fromJSON(json)]));
        const permissions = new IdentifierMap<PermissionType>(
            Object.entries(permissionsJson).map(([key, json]) => [Identifier.fromKey(key), PermissionType.deserialize(json)]),
        );
        return new PermissionManager(directory, dashboardToken, apps, permissions);
    }

    public setUpdateApproval(approval: AppUpdateApproval): void {
        this.approval = approval;
    }

    public entry(id: Identifier): AppEntry | undefined {
        return this.apps.get(id.key());
    }

    public store(): void {
        const apps = Object.fromEntries([...this.apps].map(([key, entry]) => [key, entry.toJSON()]));
        const permissions = Object.fromEntries(
            [...this.permissions].map(([id, permission]) => [id.key(), PermissionType.serialize(permission)]),
        );
        writeFileSync(path.join(this.directory, 'apps.json'), JSON.stringify(apps), 'utf-8');
        writeFileSync(path.join(this.directory, 'permissions.json'), JSON.stringify(permissions), 'utf-8');
    }

    public registerPermission(...permissions: PermissionType[]): void {
        for (const permission of permissions) {
            this.permissions.set(permission.id, permission);
        }
    }

    public generateFrameToken(url: string): string {
        const token = AppToken.random();
        this.frameTokens.set(token, url);
        return token;
    }

    public generatePluginToken(): string {
        const token = AppToken.random();
        this.pluginTokens.add(token);
        return token;
    }

    public generateAppToken(app: App): { handle: PermissionHandle; token: string } {
        const { entry, token } = AppEntry.create(app, this.entry(app.id));
        this.apps.set(app.id.key(), entry);
        this.store();
        return { handle: new AppPermissionHandle(this, app.id), token };
    }

    public removeApp(id: Identifier): void {
        if (!this.apps.delete(id.key())) return;
        this.store();
    }

    public verifyFrameToken(token: string | undefined, url: string | undefined, origin: string | undefined): string | undefined {
        if (!token) return 'Missing frame token';
        if (!origin) return 'Missing origin';
        if (!url) return 'Missing url';
        if (this.frameTokens.get(token) !== decodeURIComponent(url)) return 'Invalid frame token';
        return;
    }

    public async verifyApp(app: App, token: string): Promise<AppVerification> {
        if (app.type === 'dashboard') {
            if (this.dashboardToken !== token) return { ok: false, reason: 'Invalid token' };
            return { ok: true, handle: new FullPermissionHandle(), token };
        }
        if (app.type === 'plugin') {
            if (!this.pluginTokens.has(token)) return { ok: false, reason: 'Invalid token' };
            return { ok: true, handle: new FullPermissionHandle(), token };
        }
        return this.verifyGenericApp(app, token);
    }

    private async verifyGenericApp(app: App, token: string): Promise<AppVerification> {
        const entry = this.entry(app.id);
        if (!entry) return { ok: false, reason: `App ${app.id.key()} not found` };
        if (!entry.matchesToken(token)) return { ok: false, reason: `Token mismatch for app ${app.id.key()}` };
        const mismatch = entry.mismatch(app, this.apps);
        if (mismatch) {
            console.warn(`App data mismatch for app ${app.id.key()}: ${mismatch}`);
            const previous = entry.app;
            if (previous.metadata !== undefined && previous.metadata !== null) {
                const accepted = await this.approval?.approve(previous, app) ?? false;
                if (!accepted) {
                    return { ok: false, reason: `App data mismatch for app ${app.id.key()} and not accepted this change: ${mismatch}` };
                }
            }
            entry.replaceApp(app);
            this.store();
        }
        if (app.parentId) {
            const parent = this.entry(app.parentId);
            if (!parent) return { ok: false, reason: `Parent app ${app.parentId.key()} not found` };
            if (parent.parentId) return { ok: false, reason: 'Child apps cannot have children' };
            return { ok: true, handle: new ChildPermissionHandle(this, app.id, app.parentId), token };
        }
        return { ok: true, handle: new AppPermissionHandle(this, app.id), token };
    }

    private static read<T extends object>(file: string): T {
        if (!existsSync(file)) return {} as T;
        return JSON.parse(readFileSync(file, 'utf-8'));
    }
}
