// type generated from https://warehouse.pypa.io/api-reference/json.html
export type Downloads = {
    last_day: number;
    last_month: number;
    last_week: number;
};

export type ProjectUrls = {
    'Bug Reports': string;
    'Funding': string;
    'Homepage': string;
    'Say Thanks!': string;
    'Source': string;
};
export type Info = {
    author: string;
    author_email: string;
    bugtrack_url: string | null;
    classifiers: string[];
    description: string;
    description_content_type: 'text/markdown';
    docs_url: string | null;
    download_url: string;
    downloads: Downloads;
    home_page: string;
    keywords: string;
    license: string;
    maintainer: string;
    maintainer_email: string;
    name: string;
    package_url: string;
    platform: unknown;
    project_url: string;
    project_urls: ProjectUrls;
    release_url: string;
    requires_dist: string[];
    requires_python: string;
    summary: string;
    version: string;
    yanked: boolean;
    yanked_reason: string | null;
};
export type Digests = {
    blake2b_256: string;
    md5: string;
    sha256: string;
};

export type ReleasesItem = {
    comment_text: string;
    digests: Digests;
    downloads: string;
    filename: string;
    has_sig: boolean;
    md5_digest: string;
    packagetype: string;
    python_version: string;
    requires_python: string | null;
    size: number;
    upload_time: string;
    upload_time_iso_8601: string;
    url: string;
    yanked: boolean;
    yanked_reason: string | null;
};

export type Releases = {
    [key: string]: ReleasesItem[];
};
export type Urls = ReleasesItem[];

export type VulnerabilitiesItem = {
    aliases: string[];
    details: string;
    summary: string;
    fixed_in: string[];
    id: string;
    link: string;
    source: string;
    withdrawn: string | null;
};

export type Vulnerabilities = VulnerabilitiesItem[];

export type PackageInfo = {
    info: Info;
    last_serial: number;
    releases: Releases;
    urls: Urls;
    vulnerabilities: Vulnerabilities;
};
