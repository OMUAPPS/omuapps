import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { type ObsInstallation, ObsLegacyScript } from '../src/plugins/obs';

class FakeInstallation implements ObsInstallation {
    public readonly configDirectory: string = mkdtempSync(path.join(tmpdir(), 'obs-config-'));
    public readonly pluginDirectory: string = path.join(this.configDirectory, 'plugins', 'omuapps');
    public readonly processNames: readonly string[] = [];

    public scene(name: string): string {
        return path.join(this.configDirectory, 'basic', 'scenes', name);
    }
}

describe('ObsLegacyScript', () => {
    test('removes only the OMUAPPS script from every scene collection', () => {
        const obs = new FakeInstallation();
        mkdirSync(path.dirname(obs.scene('a.json')), { recursive: true });
        const other = { path: 'C:/scripts/other.py', settings: { value: 1 } };
        writeFileSync(obs.scene('a.json'), JSON.stringify({
            name: 'A',
            modules: { 'scripts-tool': [other, { path: 'C:/Users/u/AppData/Local/OMUAPPS/Dashboard/data/python/Lib/site-packages/omuplugin_obs/script/omuapps_plugin.py', settings: {} }] },
        }));
        writeFileSync(obs.scene('b.json'), JSON.stringify({ name: 'B', modules: {} }));

        new ObsLegacyScript(obs).remove();

        expect(JSON.parse(readFileSync(obs.scene('a.json'), 'utf-8'))).toEqual({ name: 'A', modules: { 'scripts-tool': [other] } });
        expect(JSON.parse(readFileSync(obs.scene('b.json'), 'utf-8'))).toEqual({ name: 'B', modules: {} });
    });

    test('clears the Python path only when OMUAPPS wrote it', () => {
        const obs = new FakeInstallation();
        const file = path.join(obs.configDirectory, 'user.ini');
        writeFileSync(file, '\uFEFF[General]\r\nPath64bit=C:/keep\r\n[Python]\r\nPath64bit=C:/Users/u/AppData/Local/OMUAPPS/Dashboard/data/python\r\nPath32bit=C:/Python312\r\n');

        new ObsLegacyScript(obs).remove();

        expect(readFileSync(file, 'utf-8')).toBe('\uFEFF[General]\r\nPath64bit=C:/keep\r\n[Python]\r\nPath64bit=\r\nPath32bit=C:/Python312\r\n');
    });
});
