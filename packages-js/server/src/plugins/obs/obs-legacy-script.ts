import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ObsInstallation } from './obs-installation.js';

type ScriptEntry = {
    path?: string;
};

type SceneCollection = {
    modules?: {
        'scripts-tool'?: ScriptEntry[];
    };
};

export class ObsLegacyScript {
    private static readonly SCRIPT_NAME = 'omuapps_plugin.py';
    private static readonly PYTHON_KEYS: readonly string[] = ['Path64bit', 'Path32bit'];

    public constructor(private readonly installation: ObsInstallation) {}

    public remove(): void {
        const scenes = path.join(this.installation.configDirectory, 'basic', 'scenes');
        if (existsSync(scenes)) {
            for (const name of readdirSync(scenes)) {
                if (name.endsWith('.json')) ObsLegacyScript.removeFromScene(path.join(scenes, name));
            }
        }
        const userIni = path.join(this.installation.configDirectory, 'user.ini');
        if (existsSync(userIni)) ObsLegacyScript.removePythonPath(userIni);
    }

    private static removeFromScene(file: string): void {
        let collection: SceneCollection;
        try {
            collection = JSON.parse(readFileSync(file, 'utf-8'));
        } catch (error) {
            console.warn(`Failed to read scene collection ${file}`, error);
            return;
        }
        const scripts = collection.modules?.['scripts-tool'];
        if (!scripts) return;
        const kept = scripts.filter((script) => path.basename(script.path ?? '') !== ObsLegacyScript.SCRIPT_NAME);
        if (kept.length === scripts.length) return;
        collection.modules!['scripts-tool'] = kept;
        writeFileSync(file, JSON.stringify(collection), 'utf-8');
        console.info(`Removed ${ObsLegacyScript.SCRIPT_NAME} from ${file}`);
    }

    private static removePythonPath(file: string): void {
        const text = readFileSync(file, 'utf-8');
        let section = '';
        let changed = false;
        const lines = text.split(/(\r?\n)/).map((line) => {
            const header = /^\s*\[(.+)\]\s*$/.exec(line);
            if (header) {
                section = header[1];
                return line;
            }
            if (section !== 'Python') return line;
            const entry = /^(\s*)([^=]+?)(\s*=\s*)(.*)$/.exec(line);
            if (!entry || !ObsLegacyScript.PYTHON_KEYS.includes(entry[2])) return line;
            if (!/omuapps/i.test(entry[4])) return line;
            changed = true;
            return `${entry[1]}${entry[2]}${entry[3]}`;
        });
        if (!changed) return;
        writeFileSync(file, lines.join(''), 'utf-8');
        console.info(`Removed OMUAPPS Python path from ${file}`);
    }
}
