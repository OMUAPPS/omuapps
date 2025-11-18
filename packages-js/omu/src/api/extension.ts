import { Identifier } from '../identifier';
import { Omu } from '../omu';

export interface Extension {
    readonly type: ExtensionType;
}

export class ExtensionType<T extends Extension = Extension> extends Identifier {
    constructor(
        public readonly name: string,
        public readonly create: (omu: Omu) => T,
    ) {
        super('ext', name);
    }

    public key(): string {
        return new Identifier('ext', this.name).key();
    }
}
