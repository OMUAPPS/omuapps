const lerna = await Bun.file('lerna.json').json();
const version: string = process.argv[2] ?? lerna.version;
const versionMinor = `${version.split('.').slice(0, 2).join('.')}.0`;

const versionTsPaths = [
    'packages-js/plugin-obs/src/version.ts',
    'packages-js/omu/src/version.ts',
    'packages-js/dash/src/lib/version.ts',
    'packages-js/site/src/lib/version.ts',
];

for (const path of versionTsPaths) {
    await Bun.write(path, `export const VERSION = '${version}';\nexport const VERSION_MINOR = '${versionMinor}';\n`);
}

await Bun.write('packages-js/dash/src-tauri/src/version.rs', `pub static VERSION: &str = "${version}";\n`);

const tauriPath = 'packages-js/dash/src-tauri/tauri.conf.json';
const tauri = await Bun.file(tauriPath).json();
tauri.version = version;
await Bun.write(tauriPath, `${JSON.stringify(tauri, null, 4)}\n`);

console.log(`Updated version files to ${version}`);
