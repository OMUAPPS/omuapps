import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        onlyBuilt: {
            type: 'boolean',
            default: false,
        },
        full: {
            type: 'boolean',
            default: false,
        },
    },
    strict: true,
    allowPositionals: true,
});

const rm = async (path: string) => {
    if (!await fs.exists(path)) {
        console.info(`Skipping ${path} as it does not exist`);
        return;
    }
    fs.rm(path, { recursive: true })
        .then(() => console.info(`Successfully deleted: ${path}`))
        .catch(err => console.error(`Error cleaning ${path}: ${err.message}`));
};

const modulePaths = [
    'node_modules',
    ...await fs.readdir('packages-js', { withFileTypes: true })
        .then(entries => entries.filter(entry => entry.isDirectory() && entry.name.startsWith('node_modules')).map(entry => `packages-js/${entry.name}`)),
];

const builtPaths = [
    'packages-js/chat/dist',
    'packages-js/dash/.svelte-kit',
    'packages-js/i18n/dist',
    'packages-js/omu/dist',
    'packages-js/plugin-obs/dist',
    'packages-js/site/.svelte-kit',
    'packages-js/ui/dist',
    'packages-js/ui/.svelte-kit',
];

const tauriPaths = [
    'packages-js/dash/src-tauri/target',
];

if (values.full) {
    for (const path of builtPaths) {
        rm(path);
    }
    for (const path of modulePaths) {
        rm(path);
    }
    for (const path of tauriPaths) {
        rm(path);
    }

    process.exit(0);
}

for (const path of builtPaths) {
    rm(path);
}

if (!values.onlyBuilt) {
    for (const path of modulePaths) {
        rm(path);
    }
}
