# このプロジェクトについて

## 概要

このプロジェクトは状態をブラウザ間で共有するためのAPIを提供するプロジェクトです。
各種プラグインはこのAPIを利用して状態を共有するための型の定義や機能を提供します。

## パッケージ構成

```toml
packages-js/
├── dash/               # 管理画面
├── site/               # サイトとアプリを提供するパッケージ
├── ui/                 # UIコンポーネント
├── omu/                # OMU APIのJavascript版実装
├── server/             # OMU APIのサーバー。管理画面に同梱する
├── i18n/               # 翻訳
│  # プラグイン
├── chat/               # OMUのChat APIプラグイン
├── chat-provider/      # YouTube、Twitch、Picartoのチャットの取得
├── iwashi/             # リンクをたどってアカウントの木を作る
└── plugin-obs/         # OBSプラグインの仕様

packages-cpp/
└── plugin-obs/         # OBSのC++プラグイン
```
