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
│  # プラグイン
├── chat/               # OMUのChat APIプラグイン
└── plugin-obs/         # OBSプラグイン

packages-py/
│  # OMUの実装
├── omu/                # OMU APIのPython版実装
├── server/             # OMU APIのサーバー実装
│  # チャット取得プラグイン
├── chat/               # Chatの定義
├── chat-provider/      # チャットの取得をまとめて管理するプラグイン
├── chat-youtube/       # YouTubeのチャット取得プラグイン
├── chat-twitch/        # Twitchのチャット取得プラグイン
│  # その他プラグイン
├── plugin-archive/     # 配信アーカイブプラグイン
├── plugin-discordrpc/  # Discord RPCプラグイン
├── plugin-emoji/       # 絵文字プラグイン
├── plugin-marshmallow/ # マシュマロプラグイン
├── plugin-nyanya/      # ﾆｬﾆｬ!!プラグイン
├── plugin-obs/         # OBSプラグイン
└── plugin-translator/  # 翻訳プラグイン
```
