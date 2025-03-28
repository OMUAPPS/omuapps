import { $ } from 'bun';
import { promises as fs } from 'fs';
import Path from 'path';

async function buildPackage(target: string) {
    await $`bun run --cwd ${target} build`;
}

await Promise.all([
    buildPackage('packages-js/i18n'),
    buildPackage('packages-js/omu'),
]);
await Promise.all([
    buildPackage('packages-js/chat'),
    buildPackage('packages-js/plugin-obs'),
]);

await fs.rm(Path.join(process.cwd(), 'dist'), { recursive: true, force: true });
await Promise.all([
    buildPackage('packages-js/ui'),
]);
