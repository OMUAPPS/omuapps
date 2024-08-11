import fs from 'node:fs/promises';

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

for (const path of paths) {
    fs.rm(path, { recursive: true })
        .then(() => console.info(`Successfully deleted: ${path}`))
        .catch(err => console.error(`Error cleaning ${path}: ${err.message}`))
}
