import { $, type BuildConfig, Glob } from 'bun';
import { watch } from 'node:fs';
import * as fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import isolatedDecl from './bun-plugin-isolated-decl.js';

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        entrypoint: {
            type: 'string',
            default: ['src/index.ts'],
            multiple: true,
        },
        glob: {
            type: 'boolean',
            default: false,
        },
        outdir: {
            type: 'string',
            default: './dist',
        },
        dtsdir: {
            type: 'string',
            default: './dist/dts',
        },
        watch: {
            type: 'boolean',
            default: false,
        },
        watchDir: {
            type: 'string',
            default: 'src/',
        },
        minify: {
            type: 'boolean',
            default: false,
        },
        root: {
            type: 'string',
            default: '.',
        },
        debug: {
            type: 'boolean',
            default: false,
        },
    },
    strict: true,
    allowPositionals: true,
});

function getEntrypointsFromGlob(entrypoint: string[]): string[] {
    const entrypoints: string[] = [];
    for (const entry of entrypoint) {
        const files = new Glob(entry);
        const matches = files.scanSync();
        if (!matches) {
            console.warn(`No files matched for entrypoint: ${entry}`);
        }
        entrypoints.push(...matches);
    }
    if (entrypoints.length === 0) {
        throw new Error('No entrypoints found');
    }
    return entrypoints;
}

;

async function build(entrypoints: string[]) {
    if (values.debug) {
        console.log('building', entrypoints);
        console.time('build');
    }

    await fs.rm(values.dtsdir, { recursive: true, force: true });

    const checkResult = await $`bun run tsc --noEmit --skipLibCheck --strict`.nothrow();
    if (checkResult.exitCode !== 0) {
        console.error('TypeScript type checking failed. Please fix the errors before building.');
    }
    
    for (const entrypoint of entrypoints) {
        try {
            const option: BuildConfig = {
                entrypoints: [entrypoint],
                outdir: values.outdir,
                target: 'bun',
                format: 'esm',
                sourcemap: 'inline',
                naming: '[dir]/[name].[ext]',
                minify: values.minify,
                root: values.root,
                plugins: [
                    isolatedDecl({
                        forceGenerate: true,
                        outdir: values.dtsdir, //USEIN' PATCHED ISOLATEDDECL
                    }),
                ],
            };
            const result = await Bun.build(option);
            if (!result.success) {
                console.error(`Build failed for ${entrypoint}:`);
                for (const message of result.logs) {
                    console.error(message);
                }
            }
        } catch (error) {
            console.error(`Error building ${entrypoint}:`, error);
        }
    }
    if (values.debug) {
        console.timeEnd('build');
    }
}

const entrypoints = values.glob
    ? getEntrypointsFromGlob(values.entrypoint)
    : values.entrypoint;

async function rebuild() {
    try {
        await build(entrypoints);
    } catch (error) {
        console.error('Error while rebuilding:', error);
    }
}

;

await build(entrypoints);

if (values.watch) {
    console.log('start watching');
    let debounceTimeout: Timer | null = null;

    const watcher = watch(values.watchDir, () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(rebuild, 100);
    });

    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
}
