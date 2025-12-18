import { Glob } from 'bun';

// 1. 設定: ワークスペースの package.json を探すパターン
// package.json の "workspaces" 設定に合わせて調整してください
const glob = new Glob('**/package.json');
const packageMap = new Map<string, string>();
const packagePaths: string[] = [];

// ルートディレクトリからの相対パスで検索
for await (const path of glob.scan('.')) {
    // node_modules 内は除外
    if (path.includes('node_modules')) continue;

    const file = Bun.file(path);
    const json = await file.json();

    if (json.name && json.version) {
        packageMap.set(json.name, json.version);
        packagePaths.push(path);
    }
}

console.log(`Found ${packageMap.size} packages in workspace.`);

// 2. 各 package.json の workspace:* を書き換え
for (const path of packagePaths) {
    const file = Bun.file(path);
    const json = await file.json();
    let modified = false;

    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    for (const type of depTypes) {
        if (!json[type]) continue;

        for (const [pkgName, version] of Object.entries(json[type])) {
            // workspace:* または workspace:^ などを対象にする場合
            if (typeof version === 'string' && version.startsWith('workspace:')) {
                const actualVersion = packageMap.get(pkgName);

                if (actualVersion) {
                    json[type][pkgName] = actualVersion;
                    modified = true;
                    console.log(`Updated: ${json.name} -> ${pkgName}@${actualVersion}`);
                }
            }
        }
    }

    // 変更があった場合のみ上書き
    if (modified) {
        await Bun.write(path, JSON.stringify(json, null, 2) + '\n');
    }
}

console.log('Done!');
