---
index: 18
icon: brand-obs
title: OBS
description: OBSのシーンやソースを操作する
---

# OBS

## セットアップ

```typescript
import { OBSPlugin, OBSPermissions } from '@omujs/obs';

const obs = OBSPlugin.create(omu);

omu.permissions.require(
    OBSPermissions.OBS_SCENE_READ_PERMISSION_ID,
    OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
);

omu.start();
```

`OBSPlugin.create()`と権限要求は`omu.start()`より前に行います。

## 接続状態

```typescript
const unlisten = obs.on('connected', () => {
    console.log('OBSプラグインへ接続しました');
});

obs.on('disconnected', () => {
    console.log('OBSプラグインから切断されました');
});

console.log(obs.isConnected());
unlisten();
```

## ブラウザソースを作成する

```typescript
const result = await obs.browserCreate({
    name: 'サンプルアプリ',
    url: 'https://example.com/app/asset',
    width: 1920,
    height: 1080,
});

console.log(result.source.uuid);
```

`browserAdd()`は既存のソースをシーンへ追加するときに使います。

## シーンを操作する

```typescript
const scenes = await obs.sceneList();
const current = await obs.sceneGetCurrent();

await obs.sceneSetCurrentByName('配信');
```

名前またはUUIDを使ってシーンやソースを取得・更新・削除できます。操作ごとに対応する`OBSPermissions`の権限が必要です。

## スクリーンショット

`screenshotCreate()`でソースのスクリーンショットを作成し、`screenshotGetLastBinary()`で画像データを取得できます。
