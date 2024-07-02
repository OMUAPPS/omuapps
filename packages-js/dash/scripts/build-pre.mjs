import fs from 'fs/promises';
import path from 'path';
import license from 'license-checker';
import '../../../scripts/js-build.mjs';

async function generateLicense() {
    const licenses = await new Promise((resolve, reject) => {
        license.init(
            {
                start: './',
                json: true,
            },
            (err, licenses) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(licenses);
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
