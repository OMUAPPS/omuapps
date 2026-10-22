import { Identifier, PermissionDenied } from '@omujs/omu';

import type { AppEntry } from './app-entry.js';

export interface AppEntrySource {
    entry(id: Identifier): AppEntry | undefined;
    store(): void;
}

export abstract class PermissionHandle {
    public abstract has(id: Identifier): boolean;
    public abstract grant(id: Identifier): void;
    public abstract revoke(id: Identifier): void;

    public hasAll(ids: Iterable<Identifier>): boolean {
        for (const id of ids) {
            if (!this.has(id)) return false;
        }
        return true;
    }

    public hasAny(ids: Iterable<Identifier>): boolean {
        for (const id of ids) {
            if (this.has(id)) return true;
        }
        return false;
    }

    public grantAll(ids: Iterable<Identifier>): void {
        for (const id of ids) {
            this.grant(id);
        }
    }

    public require(id: Identifier, message: string): void {
        if (!this.has(id)) throw new PermissionDenied(message);
    }
}

export class FullPermissionHandle extends PermissionHandle {
    public has(): boolean {
        return true;
    }

    public grant(): void {}

    public revoke(): void {}
}

export class AppPermissionHandle extends PermissionHandle {
    public constructor(
        private readonly source: AppEntrySource,
        private readonly id: Identifier,
    ) {
        super();
    }

    public has(id: Identifier): boolean {
        return this.source.entry(this.id)?.hasPermission(id) ?? false;
    }

    public grant(id: Identifier): void {
        const entry = this.source.entry(this.id);
        if (!entry?.grant(id)) return;
        this.source.store();
    }

    public revoke(id: Identifier): void {
        const entry = this.source.entry(this.id);
        if (!entry?.revoke(id)) return;
        this.source.store();
    }
}
