import { App, type AppJson, Identifier } from '@omujs/omu';

import { AppToken } from './app-token.js';

export type AppEntryJSON = {
    token: string;
    salt: string;
    identifier: string;
    app_json: AppJson;
    type: 'app' | 'remote' | 'plugin' | 'dashboard';
    permissions: string[];
    created_at: number;
    last_used_at: number;
    used_count: number;
};

export class AppEntry {
    private constructor(
        private readonly json: AppEntryJSON,
    ) {}

    public static fromJSON(json: AppEntryJSON): AppEntry {
        return new AppEntry(json);
    }

    public static create(app: App, existing: AppEntry | undefined): { entry: AppEntry; token: string } {
        const salt = AppToken.random();
        const token = AppToken.random();
        const appJson = App.serialize(app);
        if (existing && app.metadata === undefined) {
            appJson.metadata = existing.json.app_json.metadata;
        }
        const entry = new AppEntry({
            token: AppToken.hash(salt, token),
            salt,
            identifier: app.id.key(),
            app_json: appJson,
            type: 'app',
            permissions: existing ? [...existing.json.permissions] : [],
            created_at: Date.now() / 1000,
            last_used_at: 0,
            used_count: 0,
        });
        return { entry, token };
    }

    public get app(): App {
        return App.deserialize(this.json.app_json);
    }

    public get parentId(): Identifier | undefined {
        return Identifier.fromOptional(this.json.app_json.parent_id);
    }

    public get hashedToken(): string {
        return this.json.token;
    }

    public matchesToken(token: string): boolean {
        return AppToken.matches(this.json.salt, token, this.json.token);
    }

    public hasPermission(id: Identifier): boolean {
        return this.json.permissions.includes(id.key());
    }

    public grant(id: Identifier): boolean {
        if (this.hasPermission(id)) return false;
        this.json.permissions.push(id.key());
        return true;
    }

    public revoke(id: Identifier): boolean {
        const index = this.json.permissions.indexOf(id.key());
        if (index === -1) return false;
        this.json.permissions.splice(index, 1);
        return true;
    }

    public replaceApp(app: App): void {
        this.json.app_json = App.serialize(app);
    }

    public mismatch(app: App, installed: ReadonlyMap<string, AppEntry>): string | undefined {
        const existing = this.json.app_json;
        if (existing.id !== app.id.key()) return 'App ID does not match';
        if ((existing.parent_id ?? undefined) !== app.parentId?.key()) return 'App parent ID does not match';
        if ((existing.url ?? undefined) !== app.url) return 'App URL does not match';
        if ((existing.type ?? 'app') !== app.type) return 'App type does not match';
        if (!AppEntry.sameJson(existing.dependencies, app.dependencies)) return 'App dependencies do not match';
        if (!AppEntry.sameJson(existing.metadata, app.metadata)) return 'App metadata does not match';
        const missing = Object.keys(app.dependencies).filter((id) => !installed.has(id));
        if (missing.length > 0) return `App's dependencies are not satisfied: ${missing.join(', ')}`;
        return;
    }

    public toJSON(): AppEntryJSON {
        return this.json;
    }

    private static sameJson(left: unknown, right: unknown): boolean {
        return Bun.deepEquals(AppEntry.normalize(left), AppEntry.normalize(right));
    }

    private static normalize(value: unknown): unknown {
        if (value === null || value === undefined) return undefined;
        if (Array.isArray(value)) return value.map((item) => AppEntry.normalize(item));
        if (typeof value !== 'object') return value;
        const entries = Object.entries(value)
            .map(([key, item]) => [key, AppEntry.normalize(item)] as const)
            .filter(([, item]) => item !== undefined);
        if (entries.length === 0) return undefined;
        return Object.fromEntries(entries);
    }
}
