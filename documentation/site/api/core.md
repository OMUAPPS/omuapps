---
index: 10
icon: plug-connected
title: OMUクライアント
description: アプリを定義してOMUAPPSへ接続する
---

# OMUクライアント

## アプリを定義する

`App`にはアプリの識別子、URL、表示名などを設定します。

```typescript
import { App } from '@omujs/omu';

export const APP = new App('com.example:sample', {
    version: '1.0.0',
    url: 'https://example.com/app',
    metadata: {
        locale: 'ja',
        name: { ja: 'サンプル', en: 'Sample' },
        description: { ja: 'サンプルアプリです' },
        icon: 'ti-apps',
    },
});
```

OBS表示用などの子アプリは`parentId`を設定します。

```typescript
export const ASSET_APP = new App('com.example:sample/asset', {
    parentId: APP,
    url: 'https://example.com/app/asset',
    metadata: {
        locale: 'ja',
        name: 'サンプル表示',
    },
});
```

## 接続する

必要なAPI、権限、プラグインは`start()`より前に登録します。

```typescript
import { Omu } from '@omujs/omu';

const omu = new Omu(APP);

omu.on('ready', () => {
    console.log('APIへ接続しました');
});

omu.start();
```

`start()`は切断まで接続処理を続けるPromiseを返します。画面初期化を待つ場合は`waitForReady()`を使います。

```typescript
omu.start();
await omu.waitForReady();

console.log(omu.ready);
```

接続を終了するには`stop()`を呼びます。

## イベント

| イベント | 内容 |
| --- | --- |
| `started` | `start()`が呼ばれた |
| `ready` | APIを利用できる状態になった |
| `stopped` | `stop()`が呼ばれた |

`on()`の戻り値を呼ぶとリスナーを解除できます。

## Identifier

OMUのリソースは`namespace:path/to/resource`形式で識別します。

```typescript
import { Identifier } from '@omujs/omu';

const id = new Identifier('com.example', 'sample');
const child = id.join('config');

console.log(child.key()); // com.example:sample/config
```

namespaceには公開元ドメインを逆順にした値を使います。`https://example.com`なら`com.example`です。

## ブラウザセッション

ブラウザでは既定で`BrowserSession`がURLの`_omu_session`パラメーターから接続情報を取得します。通常は`new Omu(APP)`だけで利用できます。

関連項目: [権限](%DOCS_ROOT%/api/permission)、[セッション](%DOCS_ROOT%/api/session)
