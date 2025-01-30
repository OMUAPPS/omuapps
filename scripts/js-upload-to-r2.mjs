import { context, getOctokit } from '@actions/github';
import { execa } from 'execa';
import fs from 'fs/promises';

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
console.log(options);

const VERSION = options.version;
const TAG = `app-v${VERSION}`;

const github = getOctokit(process.env.GITHUB_TOKEN);
const { owner, repo } = context.repo;

const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo,
});
console.log(releases.map(release => release.tag_name).join(', '));

const release = releases.find(release => release.tag_name === TAG);
if (!release) {
    throw new Error(`Release not found: ${TAG}`);
}

async function downloadRelease() {
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
        ], { stderr: process.stderr, stdout: process.stdout });
    }
}

const BASE_URL = 'https://obj.omuapps.com';
const BUCKET = 'omuapps-app';
const PATH = `app/${TAG}`;

async function uploadToR2(file, path) {
    try {
        await fs.access(file);
    } catch (e) {
        throw new Error(`File not found: ${file}`);
    }
    await execa('bash', [
        '-c',
        `cat ${file} | pnpm wrangler r2 object put ${BUCKET}/${path} --pipe`
    ], { stderr: process.stderr, stdout: process.stdout });
    return `${BASE_URL}/${path}`;
}

const PLATFORMS = [
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

async function uploadVersion() {
    const files = await fs.readdir('./release-assets');
    console.log(files);
    const urls = {};
    for (const file of files) {
        const path = `${PATH}/${file}`;
        if (options["no-upload"]) {
            urls[file] = `${BASE_URL}/${path}`;
        } else {
            const url = await uploadToR2(`./release-assets/${file}`, path);
            urls[file] = url;
        }
    }
    return urls;
}

async function uploadBeta() {
    const urls = await uploadVersion();

    const releaseData = {
        version: VERSION,
        notes: release.body,
        pub_date: new Date(release.published_at).toISOString(),
        platforms: Object.fromEntries(
            await Promise.all(PLATFORMS.map(async platform => {
                const { type, filename } = platform;
                const name = filename
                    .replace('{NAME_UPPER}', 'OMUAPPS')
                    .replace('{NAME_LOWER}', 'omuapps')
                    .replace('{VERSION}', VERSION);
                const url = urls[name];
                if (!url) {
                    throw new Error(`URL not found: ${name}`);
                }
                return [type, { url }];
            }))
        ),
    };

    await fs.writeFile(
        './release-assets/version-beta.json',
        JSON.stringify(releaseData, null, 4)
    );
    await uploadToR2('./release-assets/version-beta.json', 'app/version-beta.json');

    const original = await fs.readFile('./release-assets/latest.json', 'utf-8');
    const latest = JSON.parse(original);
    latest.platforms = Object.fromEntries(
        await Promise.all(PLATFORMS.map(async platform => {
            const existing = latest.platforms[platform.type];
            if (!existing) {
                throw new Error(`Platform not found: ${platform.type}`);
            }
            const { type, filename } = platform;
            const name = filename
                .replace('{NAME_UPPER}', 'OMUAPPS')
                .replace('{NAME_LOWER}', 'omuapps')
                .replace('{VERSION}', VERSION);
            const url = urls[name];
            if (!url) {
                throw new Error(`URL not found: ${name}`);
            }
            return [type, {
                url,
                signature: existing.signature,
            }];
        }))
    );
    await fs.writeFile(
        './release-assets/latest.json',
        JSON.stringify(latest, null, 4)
    );
    await uploadToR2('./release-assets/latest.json', 'app/latest.json');
}

async function graduateBeta() {
    const urls = await uploadVersion();

    const releaseData = {
        version: VERSION,
        notes: release.body,
        pub_date: new Date(release.published_at).toISOString(),
        platforms: Object.fromEntries(
            await Promise.all(PLATFORMS.map(async platform => {
                const { type, filename } = platform;
                const name = filename
                    .replace('{NAME_UPPER}', 'OMUAPPS')
                    .replace('{NAME_LOWER}', 'omuapps')
                    .replace('{VERSION}', VERSION);
                const url = urls[name];
                if (!url) {
                    throw new Error(`URL not found: ${name}`);
                }
                return [type, { url }];
            }))
        ),
    };

    await fs.writeFile(
        './release-assets/version.json',
        JSON.stringify(releaseData, null, 4)
    );
    await uploadToR2('./release-assets/version.json', 'app/version.json');

    const original = await fs.readFile('./release-assets/latest.json', 'utf-8');
    const latest = JSON.parse(original);
    latest.platforms = Object.fromEntries(
        await Promise.all(PLATFORMS.map(async platform => {
            const existing = latest.platforms[platform.type];
            if (!existing) {
                throw new Error(`Platform not found: ${platform.type}`);
            }
            const { type, filename } = platform;
            const name = filename
                .replace('{NAME_UPPER}', 'OMUAPPS')
                .replace('{NAME_LOWER}', 'omuapps')
                .replace('{VERSION}', VERSION);
            const url = urls[name];
            if (!url) {
                throw new Error(`URL not found: ${name}`);
            }
            return [type, {
                url,
                signature: existing.signature,
            }];
        }))
    );
    await fs.writeFile(
        './release-assets/latest.json',
        JSON.stringify(latest, null, 4)
    );
    await uploadToR2('./release-assets/latest.json', 'app/latest.json');
}

await downloadRelease();
if (options.beta) {
    await uploadBeta();
}
if (options.graduate) {
    await graduateBeta();
}
