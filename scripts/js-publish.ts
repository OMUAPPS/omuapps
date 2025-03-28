import { $ } from 'bun';
import { promises as fs } from 'fs';
import Path from 'path';

async function publishPackage(target: string) {
    await $`bun publish --cwd ${target} --access public`;
}

await Promise.all([
    publishPackage('packages-js/i18n'),
    publishPackage('packages-js/omu'),
]);
await Promise.all([
    publishPackage('packages-js/chat'),
    publishPackage('packages-js/plugin-obs'),
]);

await fs.rm(Path.join(process.cwd(), 'dist'), { recursive: true, force: true });
await Promise.all([
    publishPackage('packages-js/ui'),
]);
