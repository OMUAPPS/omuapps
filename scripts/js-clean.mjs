import fs from 'fs/promises';
import path from 'path';

const paths = [
    'node_modules',
    'packages-js/omu/node_modules',
    'packages-js/omu/built',
    'packages-js/chat/node_modules',
    'packages-js/chat/built',
    'packages-js/i18n/node_modules',
    'packages-js/i18n/built',
    'packages-js/ui/node_modules',
    'packages-js/ui/dist',
    'packages-js/ui/.svelte-kit',
    'packages-js/dash/node_modules',
    'packages-js/dash/.svelte-kit',
    'packages-js/site/node_modules',
    'packages-js/site/.svelte-kit',
];

async function clean() {
    await Promise.all(
        paths.map(async (p) => {
            try {
                await fs.rm(path.join(p), { recursive: true });
            } catch (e) {
                console.error(`Error cleaning ${p}: ${e.message}`);
            }
        }),
    );
}

await clean();
