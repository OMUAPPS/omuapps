import { createHash } from 'crypto';
import { execa } from 'execa';
import { promises as fs, readdirSync, readFileSync } from 'fs';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import Path from 'path';

const BUILD_OPTION = { stderr: process.stderr, stdout: process.stdout }
const PACKAGES_DIR = Path.join(process.cwd(), 'packages-js');
const HASH_PATH = Path.join(process.cwd(), 'scripts', '_hashes.json');

const packages = new Map([...readdirSync(PACKAGES_DIR)].map((name) => {
    const path = Path.join(PACKAGES_DIR, name);
    const pkg = JSON.parse(readFileSync(Path.join(path, 'package.json'), 'utf-8'));
    return [pkg.name, { path, pkg }];
}));
const hashes = await readFile(HASH_PATH, {
    encoding: 'utf-8',
    flag: 'a+',
}).then((content) => {
    try {
        return JSON.parse(content);
    } catch (e) {
        return {};
    }
});

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

async function buildPackage(target, options = { cache: true }) {
    const pkg = packages.get(target);
    if (!pkg) {
        throw new Error(`Package ${target} not found. ${[...packages.keys()]}`);
    }
    const hash = await computeDirHash(Path.join(pkg.path, 'src'));
    const lastHash = hashes[pkg.pkg.name];
    const builtExists = await stat(Path.join(pkg.path, 'dist')).catch(() => null);
    if (options.cache && lastHash === hash && builtExists) {
        return;
    }
    await execa('pnpm', ['--filter', pkg.pkg.name, 'build'], BUILD_OPTION);
    const newHash = await computeDirHash(Path.join(pkg.path, 'src'));
    hashes[pkg.pkg.name] = newHash;
}

if (process.argv.includes('--only')) {
    await buildPackage(process.argv[process.argv.indexOf('--only') + 1]);
    process.exit(0)
}

await Promise.all([
    buildPackage('@omujs/i18n'),
    buildPackage('@omujs/omu'),
]);
await Promise.all([
    buildPackage('@omujs/chat'),
    buildPackage('@omujs/obs'),
]);

await fs.rm(Path.join(process.cwd(), 'dist'), { recursive: true, force: true });
await Promise.all([
    buildPackage('@omujs/ui', { cache: false }),
]);

if (process.argv.includes('--build')) {
    const targets = process.argv[process.argv.indexOf('--build') + 1];
    Promise.all(targets.split(',').map((target) =>
        execa('pnpm', ['--filter', target, 'build'], BUILD_OPTION)
    ))
}

await writeFile(HASH_PATH, JSON.stringify(hashes, null, 4));
