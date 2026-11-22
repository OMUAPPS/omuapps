import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type RegistryPermissionsFileJSON = {
    all?: string | null;
    read?: string | null;
    write?: string | null;
};

export type RegistryMetaJSON = {
    permissions: RegistryPermissionsFileJSON;
};

export class RegistryStore {
    private readonly metaFile: string;

    public constructor(private readonly file: string) {
        this.metaFile = `${file}.json`;
    }

    public readValue(): Uint8Array | undefined {
        if (!existsSync(this.file)) return;
        return new Uint8Array(readFileSync(this.file));
    }

    public writeValue(value: Uint8Array | undefined): void {
        if (!value) {
            rmSync(this.file, { force: true });
            return;
        }
        mkdirSync(path.dirname(this.file), { recursive: true });
        writeFileSync(this.file, value);
    }

    public readMeta(): RegistryMetaJSON | undefined {
        if (!existsSync(this.metaFile)) return;
        return JSON.parse(readFileSync(this.metaFile, 'utf-8'));
    }

    public writeMeta(meta: RegistryMetaJSON): void {
        mkdirSync(path.dirname(this.metaFile), { recursive: true });
        writeFileSync(this.metaFile, JSON.stringify(meta), 'utf-8');
    }
}
