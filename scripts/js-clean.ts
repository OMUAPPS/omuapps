import fs from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        onlyBuilt: {
            type: "boolean",
            default: false,
        },
    },
    strict: true,
    allowPositionals: true,
});

const modulePaths = [
    'node_modules',
    'packages-js/omu/node_modules',
    'packages-js/chat/node_modules',
    'packages-js/i18n/node_modules',
    'packages-js/ui/node_modules',
    'packages-js/dash/node_modules',
    'packages-js/site/node_modules',
    'packages-js/plugin-obs/node_modules',
]

const paths = [
    'scripts/_hashes.json',
    'packages-js/omu/dist',
    'packages-js/chat/dist',
    'packages-js/i18n/dist',
    'packages-js/ui/dist',
    'packages-js/ui/.svelte-kit',
    'packages-js/dash/.svelte-kit',
    'packages-js/site/.svelte-kit',
    'packages-js/plugin-obs/dist',
];

for (const path of paths) {
    fs.rm(path, { recursive: true })
        .then(() => console.info(`Successfully deleted: ${path}`))
        .catch(err => console.error(`Error cleaning ${path}: ${err.message}`))
}

if (!values.onlyBuilt) {
    for (const path of modulePaths) {
        fs.rm(path, { recursive: true })
            .then(() => console.info(`Successfully deleted: ${path}`))
            .catch(err => console.error(`Error cleaning ${path}: ${err.message}`))
    }
}
