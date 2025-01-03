<br/>
<p align="center">
    <a href="https://omuapps.com">
        <picture>
            <source srcset="./assets/title.svg">
            <img width="200" alt="OMUAPPS" src="./assets/title.svg">
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
<a href="https://app.fossa.com/projects/git%2Bgithub.com%2FOMUAPPS%2Fomuapps?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2FOMUAPPS%2Fomuapps.svg?type=shield"/></a>
    <a href="https://github.com/OMUAPPS/omuapps/blob/master/LICENSE">
        <img alt="GitHub License" src="https://img.shields.io/github/license/OMUAPPS/omuapps">
    </a>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/OMUAPPS/omuapps">
</p>
<br/>


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FOMUAPPS%2Fomuapps.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FOMUAPPS%2Fomuapps?ref=badge_large)

## OMUAPPSについて / About OMUAPPS

OMUAPPSは、アプリ間の連携やブラウザだけでは実現できない機能を厳格に制限された権限のもと提供をするAPIアプリケーションおよびそのAPIを利用するアプリケーションを提供するプラットフォームです。
OMUAPPS is a platform that provides API applications and applications that use the API that strictly limit the functions that cannot be realized between applications and cannot be realized with a browser under restricted permissions.

## 開発 / Development

OMUAPPSの開発環境を構築する方法です。
How to set up the development environment for OMUAPPS.

この手順はvscodeを使用することを前提としています。
This procedure assumes the use of vscode.

### 必要なもの / Required

必要なものをインストールしてください。
Please install the following.

- Install [Rust](https://www.rust-lang.org/ja)
- Install [Nodejs](https://nodejs.org/)
- Install [pnpm](https://pnpm.io/ja/installation)
- Install [rye](https://rye.astral.sh/)

### セットアップ / Setup

`rye sync` `pnpm i`を実行してください。
Please run `rye sync` `pnpm i`.

```bash
rye sync
pnpm i
```

### 起動 / Start

vscodeでは、起動構成から [ Server/Client ] を選択して起動してください。
In vscode, select [ Server/Client ] from the startup configuration and start.