import fs from 'fs/promises';

async function updatePkg(path: string, overrides: Record<string, unknown>) {
    const content = await fs.readFile(path, {
        encoding: 'utf-8',
    });
    let pkg = JSON.parse(content);
    pkg = {
        ...pkg,
        ...overrides,
    };
    await fs.writeFile(path, JSON.stringify(pkg, null, 4), { encoding: 'utf-8' });
}

updatePkg('packages-js/site/node_modules/@humanspeak/svelte-markdown/package.json', {
    'main': './dist/index.js',
    'svelte': './dist/index.js',
    'types': './dist/index.d.ts',
    'exports': {
        '.': {
            'import': './dist/index.js',
            'svelte': './dist/index.js',
            'types': './dist/index.d.ts',
        },
        './*': {
            'import': './dist/*/index.js',
            'svelte': './dist/*/index.js',
            'types': './dist/*/index.d.js',
        },
    },
});
