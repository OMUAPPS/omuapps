import { type BuildConfig, Glob } from 'bun';
import { watch } from 'node:fs';
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
        }
    },
    strict: true,
    allowPositionals: true,
});

const getEntrypointsFromGlob = (entrypoint: string[]): string[] => {
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
    return entrypoints
};

const build = async (_entrypoints: string[]) => {
    for (const _entrypoint of _entrypoints) {
        try {
            const option: BuildConfig = {
                entrypoints: [_entrypoint],
                outdir: values.outdir,
                target: 'bun',
                format: 'esm',
                sourcemap: 'external',
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
                console.error(`Build failed for ${_entrypoint}:`);
                for (const message of result.logs) {
                    console.error(message);
                }
            }
        } catch (error) {
            console.error(`Error building ${_entrypoint}:`, error);
        }
    }
}

const entrypoints = values.glob
    ? getEntrypointsFromGlob(values.entrypoint)
    : values.entrypoint;

build(entrypoints);

if (values.watch) {
    console.log('start watching');
    let debounceTimeout: Timer | null = null;
    const rebuild = async () => {
        try {
            await build(entrypoints);
        } catch (error) {
            console.error('Watch mode build error:', error);
        }
    };

    const watcher = watch(values.watchDir, () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(rebuild, 100);
    });

    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
}
