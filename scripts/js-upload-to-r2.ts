import { context, getOctokit } from '@actions/github';
import { $ } from 'bun';
import fs from 'fs/promises';
import { parseArgs } from 'util';

const CONFIG = {
    BUCKET: 'omuapps-app',
    BASE_URL: 'https://obj.omuapps.com',
} as const;

const { values: options } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        version: {
            type: 'string',
        },
        channel: {
            type: 'string',
            default: 'beta',
        },
        upload: {
            type: 'boolean',
            default: false,
        },
    },
    strict: true,
});

if (!options.version) {
    throw new Error('Version is required. Please provide --version parameter.');
}

const { version: VERSION } = options;
const TAG = `app-v${options.version}`;

if (options.channel !== 'beta' && options.channel !== 'stable') {
    throw new Error(`Invalid channel "${options.channel}". Channel must be "beta" or "stable".`);
}
const CHANNEL: VersionChannel = options.channel;

if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not defined in the environment variables.');
}

const github = getOctokit(process.env.GITHUB_TOKEN);
const { owner, repo } = context.repo;

const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo,
});
console.log(releases.map(release => release.tag_name).join(', '));

const release = releases.find(release => release.tag_name === TAG);
const R2_VERSION_DIR = `app/${TAG}`;
if (!release) {
    throw new Error(`Release not found: ${TAG}`);
} else {
    console.log(`Release found ${release.tag_name}: ${release.body}`);
}

const fileToUrl = await uploadVersion();

type ManifestPlatform = {
    signature: string;
    url: string;
};

type PlatformKey = 'darwin-aarch64' | 'windows-x86_64' | 'linux-x86_64' | 'darwin-x86_64';

type UpdateManifest = {
    version: string;
    notes: string;
    pub_date: string;
    platforms: Record<PlatformKey, ManifestPlatform>;
};

async function downloadRelease() {
    const { data: assets } = await github.rest.repos.listReleaseAssets({
        owner,
        repo,
        release_id: release!.id,
    });

    await fs.mkdir('./release-assets', { recursive: true });
    for (const asset of assets) {
        const url = asset.browser_download_url;
        const name = asset.name;
        await downloadToFile(url, `./release-assets/${name}`);
    }
}

await downloadRelease();
const original = await fs.readFile('./release-assets/latest.json', 'utf-8');
const ORIGINAL_LATEST: UpdateManifest = JSON.parse(original);

async function downloadToFile(url: string, filePath: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url} to ${filePath}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`Downloaded ${url} to ${filePath}`);
}

async function uploadToR2(file: string, path: string): Promise<string> {
    try {
        await fs.access(file);
    } catch (e) {
        throw new Error(`File not found: ${file}\nError: ${e}`);
    }

    const stats = await fs.stat(file);
    console.log(`Uploading ${file} (${stats.size} bytes) to ${CONFIG.BUCKET}/${path}`);

    for (let retry = 0; retry < 5; retry++) {
        const result = await $`bun wrangler r2 object put ${CONFIG.BUCKET}/${path} --remote --file ${file}`.nothrow();
        if (result.exitCode === 0) return `${CONFIG.BASE_URL}/${path}`;

        console.error(`Upload failed (attempt ${retry + 1}): ${result.stderr}`);
        if (retry < 4) {
            console.log('Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    throw new Error(`Failed to upload ${file} after 5 attempts`);
}

type Platform = {
    type: string;
    filename: string;
};

const DOWNLOAD_PLATFORMS: Platform[] = [
    {
        type: 'windows-x86_64',
        filename: 'OMUAPPS_{VERSION}_x64-setup.exe',
    },
    {
        type: 'linux-x86_64',
        filename: 'OMUAPPS_{VERSION}_amd64.AppImage',
    },
    {
        type: 'darwin-aarch64',
        filename: 'OMUAPPS_aarch64.app.tar.gz',
    },
    {
        type: 'darwin-x86_64',
        filename: 'OMUAPPS_x64.app.tar.gz',
    },
];
const UPDATER_PLATFORMS: Platform[] = [
    {
        type: 'windows-x86_64',
        filename: 'OMUAPPS_{VERSION}_x64-setup.nsis.zip',
    },
    {
        type: 'linux-x86_64',
        filename: 'OMUAPPS_{VERSION}_amd64.AppImage',
    },
    {
        type: 'darwin-aarch64',
        filename: 'OMUAPPS_aarch64.app.tar.gz',
    },
    {
        type: 'darwin-x86_64',
        filename: 'OMUAPPS_x64.app.tar.gz',
    },
];

async function uploadVersion(): Promise<Record<string, string>> {
    const files = await fs.readdir('./release-assets');
    console.log(files);
    const urls: Record<string, string> = {};
    for (const file of files) {
        const path = `${R2_VERSION_DIR}/${file}`;
        if (!options.upload) {
            urls[file] = `${CONFIG.BASE_URL}/${path}`;
            continue;
        }
        const url = await uploadToR2(`./release-assets/${file}`, path);
        urls[file] = url;
    }
    return urls;
}

type VersionChannel = 'stable' | 'beta';
type UpdateTarget = 'version' | 'latest';

async function uploadManifest(platform: Platform[], target: UpdateTarget, channel: VersionChannel) {
    const notes = release?.body ?? '';
    const pub_date = (
        ORIGINAL_LATEST.pub_date
        ?? (release?.published_at && new Date(release.published_at).toISOString())
        ?? new Date().toISOString());
    const releaseData = {
        version: VERSION,
        notes,
        pub_date,
        platforms: Object.fromEntries(platform.map(({ type, filename }) => {
            const existing = ORIGINAL_LATEST.platforms[type as PlatformKey];
            if (!existing) throw new Error(`Existing manifest not found for: ${type}`);
            const resolvedFilename = filename.replace('{VERSION}', VERSION);
            const url = fileToUrl[resolvedFilename];
            if (!url) throw new Error(`URL not found for: ${resolvedFilename}`);
            return [type, { ...existing, url }];
        })),
    };

    await fs.writeFile(
        `./release-assets/${target}-${channel}.json`,
        JSON.stringify(releaseData, null, 4),
    );
}

await uploadManifest(DOWNLOAD_PLATFORMS, 'version', CHANNEL);
await uploadManifest(UPDATER_PLATFORMS, 'latest', CHANNEL);
