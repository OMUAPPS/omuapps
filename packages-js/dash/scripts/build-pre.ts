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

async function main() {
    const tasks = [generateLicense()];
    await Promise.all(tasks);
}

await main();
