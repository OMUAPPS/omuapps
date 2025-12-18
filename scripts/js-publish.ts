import { $ } from 'bun';
import { promises as fs } from 'fs';
import Path from 'path';

async function publishPackage(target: string) {
    await $`npm publish --access public --tolerate-republish`.cwd(target).nothrow();
}

await publishPackage('packages-js/i18n');
await publishPackage('packages-js/omu');
await publishPackage('packages-js/chat');
await publishPackage('packages-js/plugin-obs');

await fs.rm(Path.join(process.cwd(), 'dist'), { recursive: true, force: true });
await publishPackage('packages-js/ui');
