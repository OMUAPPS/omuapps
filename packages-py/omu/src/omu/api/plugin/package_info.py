# type generated from https://warehouse.pypa.io/api-reference/json.html
from typing import Literal, TypedDict

type UnknownField = None


class Downloads(TypedDict):
    last_day: int
    last_month: int
    last_week: int


ProjectUrls = TypedDict(
    "ProjectUrls",
    {
        "Bug Reports": str,
        "Funding": str,
        "Homepage": str,
        "Say Thanks!": str,
        "Source": str,
    },
)


class Info(TypedDict):
    author: str
    author_email: str
    bugtrack_url: str | None
    classifiers: list[str]
    description: str
    description_content_type: Literal["text/markdown"]
    docs_url: str | None
    download_url: str
    downloads: Downloads
    home_page: str
    keywords: str
    license: str
    maintainer: str
    maintainer_email: str
    name: str
    package_url: str
    platform: UnknownField
    project_url: str
    project_urls: ProjectUrls
    release_url: str
    requires_dist: list[str]
    requires_python: str
    summary: str
    version: str
    yanked: bool
    yanked_reason: str | None


class Digests(TypedDict):
    blake2b_256: str
    md5: str
    sha256: str


class ReleasesItem(TypedDict):
    comment_text: str
    digests: Digests
    downloads: str
    filename: str
    has_sig: bool
    md5_digest: str
    packagetype: str
    python_version: str
    requires_python: str | None
    size: int
    upload_time: str
    upload_time_iso_8601: str
    url: str
    yanked: bool
    yanked_reason: str | None


type Releases = dict[str, list[ReleasesItem]]
type Urls = list[ReleasesItem]


class VulnerabilitiesItem(TypedDict):
    aliases: list[str]
    details: str
    summary: str
    fixed_in: list[str]
    id: str
    link: str
    source: str
    withdrawn: str | None


type Vulnerabilities = list[VulnerabilitiesItem]


class PackageInfo(TypedDict):
    info: Info
    last_serial: int
    releases: Releases
    urls: Urls
    vulnerabilities: Vulnerabilities
