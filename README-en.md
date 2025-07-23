<br/>
<p align="center">
    <a href="https://omuapps.com">
        <picture>
            <source srcset="https://github.com/OMUAPPS/omuapps/raw/refs/heads/develop/assets/title.svg">
            <img width="200" alt="OMUAPPS" src="https://github.com/OMUAPPS/omuapps/raw/refs/heads/develop/assets/title.svg">
        </picture>
    </a>
</p>
<br/>
<p align="center">
    <a href="https://github.com/OMUAPPS/omuapps/issues">
        <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/OMUAPPS/omuapps">
    </a>
    <a href="https://github.com/OMUAPPS/omuapps/pulls">
        <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues-pr/OMUAPPS/omuapps">
    </a>
    <a href="https://github.com/OMUAPPS/omuapps/blob/master/LICENSE">
        <img alt="GitHub License" src="https://img.shields.io/github/license/OMUAPPS/omuapps">
    </a>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/OMUAPPS/omuapps">
</p>
<br/>

## About OMUAPPS

OMUAPPS is a platform that provides API applications and applications that use the API that strictly limit the functions that cannot be realized between applications and cannot be realized with a browser under restricted permissions.

## Development

How to set up the development environment for OMUAPPS.

This procedure assumes the use of vscode.

### Requirements

Please install the following.

- Install [Rust](https://www.rust-lang.org/ja)
- Install [Nodejs](https://nodejs.org/)
- Install [bun](https://bun.sh/)
- Install [rye](https://rye.astral.sh/)

### Setup

Run `rye sync` `bun i`.

```bash
rye sync
bun i
```

### Start

In vscode, select [ Server/Client ] from the startup configuration and start.
