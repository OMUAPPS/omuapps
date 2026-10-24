import type { TableType } from '@omujs/omu/api/table';
import { EventEmitter } from '@omujs/omu/event';

import type { ServerTable, TableItems } from './server-table.js';

export class TypedTableEvents<T> {
    public readonly add: EventEmitter<[Map<string, T>]> = new EventEmitter();
    public readonly update: EventEmitter<[Map<string, T>]> = new EventEmitter();
    public readonly remove: EventEmitter<[Map<string, T>]> = new EventEmitter();
    public readonly clear: EventEmitter<[]> = new EventEmitter();
}

export class TypedTable<T> {
    public readonly events: TypedTableEvents<T> = new TypedTableEvents();

    public constructor(
        public readonly table: ServerTable,
        private readonly type: TableType<T>,
    ) {
        table.events.add.listen((items) => this.events.add.emit(this.parse(items)));
        table.events.update.listen((items) => this.events.update.emit(this.parse(items)));
        table.events.remove.listen((items) => this.events.remove.emit(this.parse(items)));
        table.events.clear.listen(() => this.events.clear.emit());
    }

    public async get(key: string): Promise<T | undefined> {
        const value = await this.table.get(key);
        if (!value) return;
        return this.type.serializer.deserialize(value);
    }

    public async add(...items: T[]): Promise<void> {
        await this.table.add(this.serialize(items));
    }

    public async update(...items: T[]): Promise<void> {
        await this.table.update(this.serialize(items));
    }

    public async remove(...items: T[]): Promise<void> {
        await this.table.remove(items.map((item) => this.type.keyFunction(item)));
    }

    public async clear(): Promise<void> {
        await this.table.clear();
    }

    public fetchAll(): Map<string, T> {
        return this.parse(this.table.fetchAll());
    }

    private serialize(items: T[]): Map<string, Uint8Array> {
        return new Map(items.map((item) => [this.type.keyFunction(item), this.type.serializer.serialize(item)]));
    }

    private parse(items: TableItems): Map<string, T> {
        return new Map([...items].map(([key, value]) => [key, this.type.serializer.deserialize(value)]));
    }
}
