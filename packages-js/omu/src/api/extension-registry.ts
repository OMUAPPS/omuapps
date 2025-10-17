import { Omu } from '../omu.js';
import type { Extension, ExtensionType } from './extension.js';

export class ExtensionRegistry {
    private readonly extensionMap: Map<string, Extension> = new Map();

    constructor(private readonly omu: Omu) {}

    register<T extends Extension>(type: ExtensionType<T>): T {
        if (this.extensionMap.has(type.name)) {
            throw new Error(`Extension type ${type.name} already registered`);
        }
        const extension = type.create(this.omu);
        this.extensionMap.set(type.name, extension);
        return extension;
    }
}
