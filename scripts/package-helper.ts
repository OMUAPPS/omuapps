import { $, Glob } from 'bun';
import esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

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

async function buildDts() {
    if (values.debug) {
        console.log('building');
        console.time('build');
    }

    await fs.rm(values.dtsdir, { recursive: true, force: true });

    const checkResult = await $`bun run tsc --noEmit --skipLibCheck --strict`.nothrow();
    if (checkResult.exitCode !== 0) {
        console.error('TypeScript type checking failed. Please fix the errors before building.');
    }

    await $`bun --bun run tsc --outDir ${values.outdir} --rootDir ${values.root}`;

    if (values.debug) {
        console.timeEnd('build');
    }
}

const entryPoints = values.glob
    ? getEntrypointsFromGlob(values.entrypoint)
    : values.entrypoint;

const options: esbuild.BuildOptions = {
    entryPoints,
    minify: true,
    outdir: './dist',
    target: 'es2022',
    platform: 'browser',
    format: 'esm',
    sourcemap: 'linked',
};

await buildDts();

if (values.watch) {
    const packageName = path.basename(process.cwd());
    const plugins: esbuild.Plugin[] = [{
        name: 'gen-dts',
        setup(build) {
            build.onStart(() => {
                console.log(`[${packageName}] changes detected`);
            });
            build.onEnd(async result => {
                if (result.errors.length > 0) {
                    console.error(`[${packageName}] failed to build:`, result);
                    return;
                }
                await buildDts();
            });
        },
    }];

    console.log(`[${packageName}] watch started`);

    const context = await esbuild.context({ ...options, plugins });
    await context.watch();

    await new Promise((resolve, reject) => {
        process.on('SIGHUP', resolve);
        process.on('SIGINT', resolve);
        process.on('SIGTERM', resolve);
        process.on('uncaughtException', reject);
        process.on('exit', resolve);
    }).finally(async () => {
        await context.dispose();
        console.log(`[${packageName}] finish watching.`);
    });
}
