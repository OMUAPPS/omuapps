import fs from 'node:fs/promises';

const rm = async (path: string) => {
    if (!await fs.exists(path)) {
        console.info(`Skipping ${path} as it does not exist`);
        return;
    }
    fs.rm(path, { recursive: true })
        .then(() => console.info(`Successfully deleted: ${path}`))
        .catch(err => console.error(`Error cleaning ${path}: ${err.message}`))
}

const builtPaths = [
    'node_modules',
    'packages-js/chat/dist',
    'packages-js/chat/node_modules',
    'packages-js/dash/.svelte-kit',
    'packages-js/dash/src-tauri/target',
    'packages-js/dash/node_modules',
    'packages-js/i18n/dist',
    'packages-js/i18n/node_modules',
    'packages-js/omu/dist',
    'packages-js/omu/node_modules',
    'packages-js/plugin-obs/dist',
    'packages-js/plugin-obs/node_modules',
    'packages-js/site/.svelte-kit',
    'packages-js/site/node_modules',
    'packages-js/ui/dist',
    'packages-js/ui/.svelte-kit',
    'packages-js/ui/node_modules',
]

for (const path of builtPaths) {
    rm(path);
}
