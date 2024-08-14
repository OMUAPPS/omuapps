import { createHash } from 'crypto';
import { execa } from 'execa';
import { readdirSync, readFileSync } from 'fs';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import Path from 'path';

const BUILD_OPTION = { stderr: process.stderr, stdout: process.stdout }
const PACKAGES_DIR = Path.join(process.cwd(), 'packages-js');

const packages = new Map([...readdirSync(PACKAGES_DIR)].map((name) => {
    const path = Path.join(PACKAGES_DIR, name);
    const pkg = JSON.parse(readFileSync(Path.join(path, 'package.json'), 'utf-8'));
    return [pkg.name, { path, pkg }];
}));

async function computeDirHash(dir) {
    const hash = createHash('md5');
    const paths = [...await readdir(dir)].map((name) => Path.join(dir, name));
    while (paths.length) {
        const path = paths.pop();
        const fileStat = await stat(path);
        if (fileStat.isDirectory()) {
            const filePaths = [...await readdir(path)].map((name) => Path.join(path, name));
            paths.push(...filePaths);
        } else {
            hash.update(await readFile(path));
        }
    }
    return hash.digest('hex');
}

async function buildPackage(target) {
    const pkg = packages.get(target);
    if (!pkg) {
        throw new Error(`Package ${target} not found. ${[...packages.keys()]}`);
    }
    const hash = await computeDirHash(Path.join(pkg.path, 'src'));
    const lastHash = pkg.pkg.srcHash;
    const builtExists = await stat(Path.join(pkg.path, 'dist')).catch(() => null);
    if (builtExists && hash === lastHash) {
        return;
    }
    await execa('pnpm', ['--filter', pkg.pkg.name, 'build'], BUILD_OPTION);
    const newHash = await computeDirHash(Path.join(pkg.path, 'src'));
    pkg.pkg.srcHash = newHash;
    await writeFile(Path.join(pkg.path, 'package.json'), JSON.stringify(pkg.pkg, null, 4));
}

if (process.argv.includes('--only')) {
    await buildPackage(process.argv[process.argv.indexOf('--only') + 1]);
    process.exit(0)
}

await Promise.all([
    buildPackage('@omujs/ui'),
    buildPackage('@omujs/i18n'),
    buildPackage('@omujs/omu'),
]);

await Promise.all([
    buildPackage('@omujs/chat'),
    buildPackage('@omujs/obs'),
]);

if (process.argv.includes('--build')) {
    const targets = process.argv[process.argv.indexOf('--build') + 1];
    Promise.all(targets.split(',').map((target) =>
        execa('pnpm', ['--filter', target, 'build'], BUILD_OPTION)
    ))
}
