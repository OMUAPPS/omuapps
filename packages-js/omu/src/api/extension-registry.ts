import type { Client } from '../client.js';

import type { Extension, ExtensionType } from './extension.js';

export class ExtensionRegistry {
    private readonly extensionMap: Map<string, Extension> = new Map();

    constructor(private readonly client: Client) {}

    register<T extends Extension>(type: ExtensionType<T>): T {
        if (this.has(type)) {
            throw new Error(`Extension type ${type.name} already registered`);
        }
        type.dependencies?.().forEach((dependency) => {
            if (!this.has(dependency)) {
                throw new Error(
                    `Extension type ${type.name} depends on ${dependency.name} which is not registered`,
                );
            }
        });
        const extension = type.create(this.client);
        this.extensionMap.set(type.name, extension);
        return extension;
    }

    registerAll(types: ExtensionType[]): void {
        types.forEach((type) => this.register(type));
    }

    get<Ext extends Extension>(extensionType: ExtensionType<Ext>): Ext {
        const extension = this.extensionMap.get(extensionType.name);
        if (!extension) {
            throw new Error(`Extension type ${extensionType.name} not registered`);
        }
        return extension as Ext;
    }

    has<T extends Extension>(extensionType: ExtensionType<T>): boolean {
        return this.extensionMap.has(extensionType.name);
    }
}
