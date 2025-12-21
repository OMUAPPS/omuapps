import { $, Glob } from 'bun';
import esbuild, { build } from 'esbuild';
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
        out: {
            type: 'string',
            default: './dist',
        },
        watch: {
            type: 'boolean',
            default: false,
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

const packageName = path.basename(process.cwd());

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
        console.log(`[${packageName}] building`);
        console.time('build');
    }

    const checkResult = await $`bun run tsgo --noEmit --skipLibCheck --strict`.nothrow();
    if (checkResult.exitCode !== 0) {
        console.error('TypeScript type checking failed. Please fix the errors before building.');
    }

    await $`bun --bun run tsgo --project tsconfig.json --outDir ${values.out} --declaration true --emitDeclarationOnly true --rootDir ${values.root}`;

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
    outdir: values.out,
    target: 'es2022',
    platform: 'browser',
    format: 'esm',
    sourcemap: 'linked',
};

await buildDts();

if (values.watch) {
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
} else {
    console.log(`[${packageName}] building...`);

    await build(options)
        .then(() => {
            console.log(`[${packageName}] built successfully.`);
        })
        .catch((err) => {
            process.stderr.write(err.stderr);
            process.exit(1);
        });

    await buildDts();

    console.log(`[${packageName}] build finished.`);
}
