import { type Client } from '../client.js';
import { Identifier } from '../identifier';

export interface Extension {
    readonly type: ExtensionType;
}

export class ExtensionType<T extends Extension = Extension> extends Identifier {
    constructor(
        public readonly name: string,
        public readonly create: (client: Client) => T,
        public readonly dependencies?: () => ExtensionType[],
    ) {
        super('ext', name);
    }

    public key(): string {
        return this.name;
    }
}
