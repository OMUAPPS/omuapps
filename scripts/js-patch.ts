import fs from 'fs/promises';

async function updatePkg(path: string, overrides: Record<string, unknown>) {
    if (!await fs.exists(path)) {
        console.info(`Skipped patching ${path}`);
        return;
    }
    const content = await fs.readFile(path, {
        encoding: 'utf-8',
    });
    let pkg = JSON.parse(content);
    pkg = {
        ...pkg,
        ...overrides,
    };
    await fs.writeFile(path, JSON.stringify(pkg, null, 4), { encoding: 'utf-8' });
    console.log(`Successfully patched ${path}`);
}

await updatePkg('packages-js/site/node_modules/@humanspeak/svelte-markdown/package.json', {
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
await updatePkg('packages-js/dash/node_modules/@humanspeak/svelte-markdown/package.json', {
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
await updatePkg('node_modules/.bun/@humanspeak+svelte-markdown@0.8.13+acce27d485e4186f/node_modules/@humanspeak/svelte-markdown/package.json', {
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
await updatePkg('node_modules/highlight.js/package.json', {
    'exports': {
        '.': {
            'types': './types/index.d.ts',
            'require': './lib/index.js',
            'import': './lib/index.js',
        },
        './package.json': './package.json',
        './lib/common': {
            'require': './lib/common.js',
            'import': './lib/common.js',
        },
        './lib/core': {
            'require': './lib/core.js',
            'import': './lib/core.js',
        },
        './lib/languages/*': {
            'require': './lib/languages/*.js',
            'import': './lib/languages/*.js',
        },
        './scss/*': './scss/*',
        './styles/*': './styles/*',
        './types/*': './types/*',
    },
});
