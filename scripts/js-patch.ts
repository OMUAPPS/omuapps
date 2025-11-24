import { Glob } from 'bun';
import fs from 'fs/promises';

const original = `/** @param {string} path */
export function rimraf(path) {
	fs.rmSync(path, { force: true, recursive: true });
}`.replace(/\r\n/g, '\n');

const patch = `/** @param {string} path */
export function rimraf(path) {
    try {
        fs.rmSync(path, { force: true, recursive: true });
    } catch (/** @type {any} */ e) {
    }
}`.replace(/\r\n/g, '\n');

const glob = new Glob('node_modules/**/package/src/filesystem.js');
for await (const path of glob.scan('.')) {
    let content = (await fs.readFile(path, 'utf-8')).replace(/\r\n/g, '\n');
    const alreadyPatched = content.includes(patch);
    if (alreadyPatched) {
        console.log(`Already patched ${path}`);
    } else {
        if (!content.includes(original)) {
            throw new Error(`Original not found in ${path}: ${content.split('\n').slice(10, 30).join('\n')}`);
        } else {
            content = content.replace(original, patch);
            await fs.writeFile(path, content, 'utf-8');
            console.log('Patched', path);
        }
    }
}
