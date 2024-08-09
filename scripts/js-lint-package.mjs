import { readdirSync, readFileSync, writeFileSync } from "fs";

const KEY_ORDER = [
    "private",
    "type",
    "name",
    "version",
    "description",
    "license",
    "svelte",
    "types",
    "exports",
    "scripts",
    "repository",
    "devDependencies",
    "peerDependencies",
    "dependencies",
    "files",
    "gitHead",
];

readdirSync("packages-js").map((name) => `packages-js/${name}`).forEach((path) => {
    const pkg = readFileSync(`${path}/package.json`, "utf-8");
    const pkgObj = JSON.parse(pkg);
    const newPkgObj = {};
    KEY_ORDER.forEach((key) => {
        if (!pkgObj[key]) return;
        newPkgObj[key] = pkgObj[key];
        delete pkgObj[key];
    });
    if (Object.keys(pkgObj).length > 0) {
        throw new Error(`Unkown keys in ${path}/package.json: ${Object.keys(pkgObj).join(", ")}`);
    };
    const newPkg = JSON.stringify(newPkgObj, null, 4);
    writeFileSync(`${path}/package.json`, `${newPkg}\n`);
});
