import { context, getOctokit } from '@actions/github';
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

const github = getOctokit(process.env.GITHUB_TOKEN);
const { owner, repo } = context.repo;
const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo,
});
console.log(releases);
const release = releases.find(release => release.tag_name === options.tag);
if (!release) {
    throw new Error(`Release not found: ${options.tag}`);
}
const { data: assets } = await github.rest.repos.listReleaseAssets({
    owner,
    repo,
    release_id: release.id,
});
// download assets to ./release-assets
for (const asset of assets) {
    const url = asset.browser_download_url;
    const name = asset.name;
    execaSync('curl', ['-LJO', url, '--header', 'User-Agent: pnpm', '--header', `Authorization: token ${process.env.GITHUB_TOKEN}`, '-o', `./release-assets/${name}`], option);
}

const BASE_URL = 'https://obj.omuapps.com/'
const BUCKET = 'omuapps-app'
const PATH = 'app'

const urls = readdirSync('./release-assets').map(file => {
    execaSync('bash', ['-c', `cat ./release-assets/${file} | pnpm wrangler r2 object put ${BUCKET}/${PATH}/${file} --pipe`], option);
    return `${BASE_URL}/${PATH}/${file}`;
});
