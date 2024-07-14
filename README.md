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
    <a href="https://github.com/OMUAPPS/omuapps/blob/master/LICENSE">
        <img alt="GitHub License" src="https://img.shields.io/github/license/OMUAPPS/omuapps">
    </a>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/OMUAPPS/omuapps">
</p>
<br/>

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

vscodeでは、`F5`を押すだけで開発サーバーとダッシュボードが起動します。
In vscode, just press `F5` to start the development server and dashboard.
