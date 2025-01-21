import { context, getOctokit } from '@actions/github';
import { execa, execaSync } from 'execa';
import fs from 'fs/promises';

const option = { stderr: process.stderr, stdout: process.stdout };

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

const version = options.version;
const tag = `app-v${version}`;
const github = getOctokit(process.env.GITHUB_TOKEN);
const { owner, repo } = context.repo;

const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo,
});
console.log(releases);

const release = releases.find(release => release.tag_name === tag);
if (!release) {
    throw new Error(`Release not found: ${tag}`);
}

const { data: assets } = await github.rest.repos.listReleaseAssets({
    owner,
    repo,
    release_id: release.id,
});

// download assets to ./release-assets
await fs.mkdir('./release-assets', { recursive: true });
for (const asset of assets) {
    const url = asset.browser_download_url;
    const name = asset.name;
    await execa('bash', [
        '-c',
        `curl -L -o ./release-assets/${name} ${url}`
    ], option);
}

const BASE_URL = 'https://obj.omuapps.com';
const BUCKET = 'omuapps-app';
const PATH = `app/${tag}`;

const files = await fs.readdir('./release-assets');
const urls = Object.fromEntries(
    await Promise.all(files.map(async file => {
        execaSync('bash', [
            '-c',
            `cat ./release-assets/${file} | pnpm wrangler r2 object put ${BUCKET}/${PATH}/${file} --pipe`
        ], option);
        return [file, `${BASE_URL}/${PATH}/${file}`];
    }))
);

execaSync('bash', [
    '-c',
    `cat ./release-assets/latest-beta.json | pnpm wrangler r2 object put ${BUCKET}/app/latest-beta.json --pipe`
], option);

const platforms = [
    {
        type: 'windows-x86_64',
        filename: '{NAME_UPPER}_{VERSION}_x64-setup.exe',
    },
    {
        type: 'linux-x86_64',
        filename: '{NAME_LOWER}_{VERSION}_amd64.AppImage.tar.gz',
    },
    {
        type: 'darwin-aarch64',
        filename: '{NAME_UPPER}_aarch64.app.tar.gz',
    },
    {
        type: 'darwin-x86_64',
        filename: '{NAME_UPPER}_x64.app.tar.gz',
    },
];

const releaseData = {
    version: options.version,
    notes: release.body,
    pub_date: new Date(release.published_at).toISOString(),
    platforms: Object.fromEntries(
        await Promise.all(platforms.map(async platform => {
            const { type, filename } = platform;
            const name = filename
                .replace('{NAME_UPPER}', 'OMUAPPS')
                .replace('{NAME_LOWER}', 'omuapps')
                .replace('{VERSION}', options.version);
            const url = urls[name];
            return [type, { url }];
        }))
    ),
};

await fs.writeFile(
    './release-assets/version-beta.json',
    JSON.stringify(releaseData, null, 4)
);

execaSync('bash', [
    '-c',
    `cat ./release-assets/version-beta.json | pnpm wrangler r2 object put ${BUCKET}/app/version-beta.json --pipe`
], option);
