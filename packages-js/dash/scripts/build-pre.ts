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

async function main() {
    const tasks = [generateLicense(), stageObsPlugin()];
    await Promise.all(tasks);
}

await main();
