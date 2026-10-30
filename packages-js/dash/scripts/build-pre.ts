import fs from 'fs/promises';
import license from 'license-checker';
import path from 'path';

async function generateLicense() {
    const licenses: Record<string, { name?: string; repository?: string; url?: string; licenses?: string; licenseFile?: string }> = await new Promise((resolve, reject) => {
        license.init(
            {
                start: './',
                json: true,
            },
            (err, licenses) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(licenses as Record<string, { name?: string; repository?: string; url?: string; licenses?: string; licenseFile?: string }>);
                }
            },
        );
    });
    const destDir = path.join('src', 'lib', 'license');
    const destFile = path.join(destDir, 'licenses.json');
    await fs.writeFile(
        destFile,
        JSON.stringify([
            ...(await Promise.all(
                Object.entries(licenses).map(async ([key, license]) => ({
                    name: license.name || key,
                    repository: license.repository,
                    url: license.url,
                    license: license.licenses,
                    licenseText:
                        license.licenseFile && (await fs.readFile(license.licenseFile, 'utf8')),
                })),
            )),
        ]),
    );
}

async function stageObsPlugin() {
    const source = path.join('..', '..', 'packages-cpp', 'plugin-obs', 'release', 'omuapps');
    const destination = path.join('src-tauri', 'obs-plugin', 'omuapps');
    await fs.rm(destination, { recursive: true, force: true });
    const exists = await fs.stat(source).then(() => true, () => false);
    if (!exists) {
        if (process.platform === 'win32') {
            console.warn(`OBS plugin is not built: ${source}`);
        }
        return;
    }
    await fs.cp(source, destination, { recursive: true });
}

async function buildServer() {
    const rustc = Bun.spawnSync(['rustc', '-vV'], { stdout: 'pipe' });
    const target = /^host: (.+)$/m.exec(rustc.stdout.toString())?.[1].trim();
    if (!target) {
        throw new Error('Failed to detect the Rust target triple');
    }
    const extension = process.platform === 'win32' ? '.exe' : '';
    const outfile = path.join('src-tauri', 'binaries', `omuserver-${target}${extension}`);
    const { version } = await Bun.file(path.join('..', 'omu', 'package.json')).json();
    const windowsOptions = process.platform === 'win32'
        ? [
            `--windows-icon=${path.join('src-tauri', 'icons', 'icon.ico')}`,
            '--windows-title=OMUAPPS Server',
            '--windows-publisher=OMUAPPS',
            '--windows-description=OMUAPPS Server',
            `--windows-version=${version}.0`,
        ]
        : [];
    const build = Bun.spawnSync(
        [
            'bun',
            'build',
            path.join('..', 'server', 'src', 'main.ts'),
            path.join('..', 'server', 'src', 'session', 'decryptor-worker.ts'),
            '--compile',
            '--outfile',
            outfile,
            ...windowsOptions,
        ],
        { stdout: 'inherit', stderr: 'inherit' },
    );
    if (build.exitCode !== 0) {
        throw new Error(`Failed to build server: exit code ${build.exitCode}`);
    }
}

async function main() {
    const tasks = [generateLicense(), stageObsPlugin(), buildServer()];
    await Promise.all(tasks);
}

await main();
