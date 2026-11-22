import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import type { App } from '@omujs/omu';

import type { ServerAddress } from '../../api';

export type LaunchCommand = {
    args: string[];
    cwd?: string;
};

export type ObsConfigJSON = {
    log_path?: string;
    python_path?: string;
    server?: ServerAddress;
    launch?: LaunchCommand | null;
};

export class ObsFiles {
    public static directory(): string {
        const directory = path.join(homedir(), '.omuapps');
        mkdirSync(directory, { recursive: true });
        return directory;
    }

    public static configPath(): string {
        return path.join(ObsFiles.directory(), 'obs_config.json');
    }

    public static tokenPath(): string {
        return path.join(ObsFiles.directory(), 'token.json');
    }

    public static readConfig(): ObsConfigJSON {
        return ObsFiles.read<ObsConfigJSON>(ObsFiles.configPath());
    }

    public static writeConfig(config: ObsConfigJSON): void {
        writeFileSync(ObsFiles.configPath(), JSON.stringify(config), 'utf-8');
    }

    public static storeToken(address: ServerAddress, app: App, token: string): void {
        const tokens = ObsFiles.read<Record<string, string>>(ObsFiles.tokenPath());
        tokens[ObsFiles.tokenKey(address, app)] = token;
        writeFileSync(ObsFiles.tokenPath(), JSON.stringify(tokens), 'utf-8');
    }

    public static tokenKey(address: ServerAddress, app: App): string {
        return `${address.host}:${address.port}:${address.hash ?? ''}:${app.id.key()}`;
    }

    public static remove(): void {
        rmSync(ObsFiles.configPath(), { force: true });
        rmSync(ObsFiles.tokenPath(), { force: true });
    }

    private static read<T extends object>(file: string): T {
        if (!existsSync(file)) return {} as T;
        try {
            return JSON.parse(readFileSync(file, 'utf-8'));
        } catch (error) {
            console.warn(`Failed to read ${file}`, error);
            return {} as T;
        }
    }
}
