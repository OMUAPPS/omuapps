import fs from 'fs/promises';
import path from 'path';

async function generateConsts() {
    const url = process.env.CF_PAGES_URL;
    const constsFile = path.join('src', 'lib', 'consts.ts');
    await fs.writeFile(constsFile, `export const CF_PAGES_URL = '${url}';`);
}

await generateConsts();
