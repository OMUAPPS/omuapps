import { createHash } from "crypto";
import { execa } from 'execa';
import { existsSync } from "fs";
import { readdir, readFile, stat, writeFile } from "fs/promises";
import path from 'path';

const packages = await readdir("packages-js")
const packageNameList = {}
await Promise.all(packages.map(async (name) => {
    const pkg = await readFile(`packages-js/${name}/package.json`);
    const library = JSON.parse(pkg);
    if (library.name) {
        if (library.name.includes("@omujs/")) {
            packageNameList[library.name.replace("@omujs/", "")] = name
        } else {
            packageNameList[library.name] = name
        }
    }
}))

async function computeMetaHash(folder, builtFolders, inputHash = null) {
    const hash = inputHash ? inputHash : createHash('sha256')
    const info = await readdir(folder, { withFileTypes: true });
    files: for (const item of info) {
        const fullPath = path.join(folder, item.name);
        for (const ignore of builtFolders) {
            if (item.name.includes(ignore)) {
                continue files
            }
        }
        if (item.isFile()) {
            const statInfo = await stat(fullPath);
            const fileInfo = `${fullPath}:${statInfo.size}:${statInfo.mtimeMs}`;
            hash.update(fileInfo);
        } else if (item.isDirectory()) {
            hash.update(fullPath);
            await computeMetaHash(fullPath, builtFolders, hash);
        }
    }
    if (!inputHash) {
        return hash.digest().toString("hex");
    }
}

async function build(name, builtFolders) {
    if (!packageNameList[name]) throw new Error("nonexistent package")
    const projectName = packageNameList[name]

    const projectPath = `packages-js/${projectName}`
    const packagePath = `packages-js/${projectName}/package.json`
    const pkg = await readFile(packagePath);
    const library = JSON.parse(pkg);
    const hash = await computeMetaHash(projectPath, ["package.json", ...builtFolders])

    let existBuiltFolder = true
    for (const builtFolder of builtFolders) {
        if (existBuiltFolder) existBuiltFolder = existsSync(`${projectPath}/${builtFolder}`)
    }

    if (library.private && library.private == true || !library.lastBuiltHash || library.lastBuiltHash != hash || !existBuiltFolder) {
        library.lastBuiltHash = hash
        const newPkg = JSON.stringify(library, null, 4);
        await writeFile(packagePath, `${newPkg}\n`);
        return doBuild(name)
    } else {
        return console.log(`${name}: build skipped. (last build found)`)
    }
}

function doBuild(name) {
    return execa('pnpm', ['--filter', name, 'build'], { stderr: process.stderr, stdout: process.stdout })
}

if (process.argv.includes('--build')) {
    if (!process.argv.includes('--builtFolders')) throw new Error("pnpm build --build <Name> --builtFolders <builtFolderName>")
    const targets = process.argv[process.argv.indexOf('--build') + 1].split(' ')
    const builtFolders = process.argv[process.argv.indexOf('--builtFolders') + 1].split(' ')
    Promise.all(targets.map((target) =>
        build(target, builtFolders)
    ))
} else {
    await Promise.all([
        build("ui", ["dist", ".svelte-kit"]),
        build("i18n", ["built"]),
        build("omu", ["built"])
    ]);
    await build("chat", ["built"])
    await Promise.all([
        build("obs", ["built"])
    ]);
}
