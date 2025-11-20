---
index: 1
icon: tutorial
title: チュートリアル
description: 初めてのおむアプリを作ってみる
---

# チュートリアル

このチュートリアルでは Svelte 5 と OMUAPPS を組み合わせて、配信向けのアプリを作ります

## おむアプリとして構築する利点

おむアプリは実行者のPC内で実行されているAPIサーバーで完結します

外部のサーバーに送信しない限り実行者のPC内で完結するので、サーバー管理者がデータを管理していないことからプライバシーに強く、そして、どんなに重い処理をしていても、サーバーを契約して借りる必要がないため安定してアプリを提供できます

## 環境を構築

このチュートリアルでは[bun](https://bun.sh/)をパッケージマネージャーとして使用します

SvelteKit を構築し、アプリを作るのに必要な依存関係をインストールしましょう

```bash
bunx sv create example
```

基本的には以下のように選択します

```bash
┌  Welcome to the Svelte CLI! (v0.9.14)
│
◇  Which template would you like?
│  SvelteKit minimal
│
◇  Add type checking with TypeScript?
│  Yes, using TypeScript syntax // OMUAPPSのAPIはTypeScriptを使うことを前提に設計されているため、使うことを推奨します
│
◆  Project created
│
◇  What would you like to add to your project? (use arrow keys / space bar)
│  devtools-json // 好みで入れます
│
◆  Successfully setup add-ons
│
◇  Which package manager do you want to install dependencies with?
│  bun // このチュートリアルではbunを使って構築します
```

プロジェクトディレクトリに移動します

```bash
cd example
```

このチュートリアルで必要になる依存関係をインストールしましょう

```bash
%PACKAGE_MANAGER% install @omujs/omu @omujs/obs
```

それぞれ

- `@omujs/omu` APIクライアント本体
- `@omujs/obs` OBSを操作するためのインターフェース

の役割になっています

## アプリを作る

アプリを導入できる状態にするには、これら4つのページを作成する必要があります

### 1. アプリ情報

名前や説明、管理画面のURLなどを設定します。
これは認証のために使われるため正確に設定する必要があります

### 2. アプリ情報配信ページ

サイトがどのアプリを管理しているかを確認するために必要です

### 3. アプリ操作ページ

管理画面で開かれるアプリのページです

### 4. アプリ表示ページ

OBS側で開かれるアプリのページです

アプリの出処を確認するところからOBS上の表示まで4つのページ必要ですが、一つずつ作成していきましょう

## アプリ情報

### その前にIdentifier (識別子) について

識別子はAPIオブジェクトがどのアプリによって所有され、どのような名前かによって一意に識別するために使われる`namespace:path`の構造をした文字列です

- `namespace`部は逆順ドメイン(`https://omuapps.github.io/`の場合io.github.omuappsになります)。
- `path`部は / 区切りで、英数字と - _ のみ使うことができます。

構造が保証された状態で安全に処理するためにはIdentifierクラスを使うことができます

`new Identifier(namespace, ...path)`

- namespace: 逆順ドメイン
- path: 識別子のパス

例：io.github.omuapps:path/to/id

> 注意⚠️
> URL以外では識別子はすべてドメインが逆順な事にご注意ください

`src/routes/tutorial/index.ts`を作成しその中に情報を書き込みます

必要な物をインポートし定数を設定します

```typescript
// src/routes/tutorial/index.ts

import { dev } from "$app/environment";
import { App } from "@omujs/omu";

export const ORIGIN = dev ? 'http://localhost:5173' : 'https://omuapps.github.io' // 公開先のOrigin (開発時はローカルサーバーのOriginを指定する)
export const NAMESPACE = 'io.github.omuapps' // 公開先の逆順ドメイン
```

アプリ情報は`App`クラスから設定します

`new App(id, options)`

- `id`: 識別子となるIDです。`https://omuapps.github.io/`に公開する場合、逆順ドメイン名で`io.github.omuapps/name`と入力
- `options`: 名前や説明などアプリの情報を設定

管理画面用とアセット用の２つを設定します

```typescript
// 管理画面用のアプリ情報
export const TUTORIAL_APP = new App(`${NAMESPACE}:tutorial`, {
    url: `${ORIGIN}/tutorial`, // アプリの開かれるページのURL
    metadata: {
        locale: "ja", // アプリの推奨言語
        name: "チュートリアルアプリ", // アプリの名前
        description: "初めてのアプリ", // 一行の説明をつけることを推奨
        icon: 'ti-typography' // アイコンのURL、もしくは先端にti-をつけることでTabler Iconsのアイコンを指定することができます
    },
});

// 配信画面用のアプリ情報
export const TUTORIAL_ASSET_APP = new App(`${NAMESPACE}:tutorial/app`, {
    url: `${ORIGIN}/tutorial/asset`, // アセットの開かれるページのURL
    parentId: TUTORIAL_APP, // 親アプリを設定
    metadata: {
        locale: "ja",
        name: "チュートリアルアセット",
    },
});
```

## アプリ情報配信ページ

`/_omuapps.json`にアクセスすることでアプリ情報を取得できるようにします

アプリ情報を含んだJSONを配信することで完了しますが、ここではSvelteKitのルーティングを使って自動で配信する仕組みも作ってみましょう

`src/routes/_omuapps.json/+server.ts`

``` typescript
// src/routes/_omuapps.json/+server.ts

import { AppIndexRegistry } from '@omujs/omu';
import { json } from '@sveltejs/kit';
import { NAMESPACE, TUTORIAL_APP } from '../tutorial';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
    return json(
        AppIndexRegistry.build({
            id: `${NAMESPACE}:apps`,
            meta: {
                name: 'チュートリアル', // 名前
                note: 'チュートリアル用提供元', // 1行の説明
            },
            apps: [TUTORIAL_APP], // 配信するアプリの配列
        }).toJSON()
    );
};
```

### ここで一度アプリを導入してみましょう

#### 1. 開発者モード

管理画面の「設定」 →「一般」→ 最下部の「開発者モード」を有効にする

#### 2. ホストマッピング

「設定」→「開発者」→「アプリ開発用ホストマッピング」で、変換元にローカルサーバーの`host:port`(例: `localhost:5173`)を入力、変換先に公開先(例: `omuapps.github.io`)を入力して追加

#### 3. 提供元を追加

以下のURLを開いて提供元を追加する

```url
http://localhost:26423/index/install?index_url=<_omuapps.jsonのURL>
```

(例：`http://localhost:26423/index/install?index_url=http://localhost:5173/_omuapps.json`)

#### 4. アプリを追加

「アプリを追加」タブからアプリを追加して、アプリを開きます。404 エラーが表示されれば、アプリの URL 設定までは正しく登録されています（次に中身を実装します）

## アプリの中身を書く

操作（管理画面）を作る前に、`src/routes/tutorial/index.ts`にアプリのデータ型とそれを管理するクラスを追加します。
ここでは[レジストリ API](%DOCS_ROOT%/api/registry)を使い、簡単にデータを保持・共有する事ができます

```typescript
// src/routes/tutorial/index.ts
// ...

import type { Writable } from "svelte/store";
import { Omu } from '@omujs/omu';

type TutorialData = {
    text: string
};

export class TutorialApp {
    public tutorialData: Writable<TutorialData>;

    constructor(omu: Omu) {
        this.tutorialData = omu.registries.json<TutorialData>('tutorial_data', {
            default: {
                text: 'Default text'
            }
        }).compatSvelte();
    }
}
```

続いて、`src/routes/tutorial/+page.svelte`に操作ページを作ります

```svelte
<script lang="ts">
    import { browser } from "$app/environment";
    import { OBSPermissions, OBSPlugin } from "@omujs/obs";
    import { Omu, OmuPermissions } from "@omujs/omu";
    import { TUTORIAL_APP, TUTORIAL_ASSET_APP, TutorialApp } from ".";

    // APIを触るのに必要なOmuオブジェクトを生成します
    const omu = new Omu(TUTORIAL_APP);

    // Omuオブジェクトからその他のAPIを使用する事ができます
    const obs = OBSPlugin.create(omu);

    // アプリを初期化して必要な変数を取り出します
    const { tutorialData } = new TutorialApp(omu);

    // 必要な権限を要求します
    omu.permissions.require(
        OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
        OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
    );

    // ブラウザのみでAPIに接続します
    if (browser) {
        omu.start();
    }

    // OBSにソースを追加する関数
    async function handleInstall() {
        // アセット用のtokenを生成
        const session = await omu.sessions.generateToken({
            app: TUTORIAL_ASSET_APP,
        });
        const url = new URL(TUTORIAL_ASSET_APP.url!);
        url.searchParams.set(
            BrowserSession.PARAM_NAME,
            JSON.stringify(session),
        );
        // OBSにソースを追加
        await obs.browserAdd({
            name: "チュートリアル表示", // ソース名
            url: url.toString(),
        });
    }
</script>

<h2>文字</h2>
<textarea cols="50" rows="5" bind:value={$tutorialData.text}></textarea>

<button onclick={handleInstall}> OBSに追加 </button>
```

最後に`src/routes/tutorial/asset/+page.svelte`に表示側ページを作っていきましょう

```svelte
<script lang="ts">
    import { Omu, OmuPermissions } from "@omujs/omu";
    import { TUTORIAL_ASSET_APP, TutorialApp } from "..";
    import { browser } from "$app/environment";

    const omu = new Omu(TUTORIAL_ASSET_APP);
    const { tutorialData } = new TutorialApp(omu);

    if (browser) {
        omu.permissions.require(
            OmuPermissions.REGISTRY_PERMISSION_ID,
        )
        omu.start()
    }
</script>

<h1>
    {$tutorialData.text}
</h1>

<style>
    h1 {
        background: #000;
        color: #fff;
    }
</style>
```

## 完成

これで管理画面と OBS 間でデータを同期し、同じ文字列を表示する簡単なアプリが完成です

OMUAPPSのアプリはこのチュートリアルで扱ったレジストリを含めて様々なAPIを使用しています。その他のAPIについては[API一覧](%DOCS_ROOT%/api)を参照してください
