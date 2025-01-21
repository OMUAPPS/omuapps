import { execaSync } from 'execa';
import { readdirSync } from 'fs';
const option = { stderr: process.stderr, stdout: process.stdout }

const options = (() => {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = args[i + 1];
            options[key] = value;
        }
    }
    return options;
})();


const BASE_URL = 'https://obj.omuapps.com/'
const BUCKET = 'omuapps-app'
const PATH = 'app'

const urls = readdirSync('./release-assets').map(file => {
    execaSync('bash', ['-c', `cat ./release-assets/${file} | pnpm wrangler r2 object put ${BUCKET}/${PATH}/${file} --pipe`], option);
    return `${BASE_URL}/${PATH}/${file}`;
});
