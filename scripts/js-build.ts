import { $ } from 'bun';
import { promises as fs } from 'fs';
import Path from 'path';

async function buildPackage(target: string) {
    console.log(`Building ${target}`);
    await $`bun run --cwd ${target} build`.catch((error) => {
        console.error(`Error building ${target}`);
        console.write(error.stdout);
        process.exit(1);
    });
    console.log(`Building ${target} finished`);
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
