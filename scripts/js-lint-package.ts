import { readdir, readFile, writeFile } from 'node:fs/promises';

const KEY_ORDER = [
    'private',
    'type',
    'name',
    'version',
    'description',
    'license',
    'svelte',
    'types',
    'exports',
    'scripts',
    'repository',
    'devDependencies',
    'peerDependencies',
    'dependencies',
    'files',
    'gitHead',
];

const packages = await readdir('packages-js')
packages.map((name) => `packages-js/${name}/package.json`).forEach(async (path) => {
    const pkg = await readFile(path, 'utf-8');
    const pkgObj = JSON.parse(pkg);
    const newPkgObj = {};
    for (const key of KEY_ORDER) {
        if (!pkgObj[key]) return;
        newPkgObj[key] = pkgObj[key];
        delete pkgObj[key];
    }
    if (Object.keys(pkgObj).length > 0) {
        throw new Error(`Unkown keys in ${path}: ${Object.keys(pkgObj).join(', ')}`);
    }
    const newPkg = JSON.stringify(newPkgObj, null, 4);
    await writeFile(path, `${newPkg}\n`);
});
