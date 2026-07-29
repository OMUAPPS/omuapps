---
index: 23
icon: photo-scan
title: アセット
description: アセットでファイルとして保持
---

# アセット

## 概要

大きいデータをファイルとして保持する事ができます

## 必要な権限

`OmuPermissions.ASSET_PERMISSION_ID`の権限が必要です

```typescript
omu.permissions.require(OmuPermissions.ASSET_PERMISSION_ID);
```

## 使い方

`.upload(id, buffer)`を使ってアップロード

`.download(id)`を使ってダウンロード

- id: アセットの識別子
- buffer: アセットのUint8Arrayで表された内容

```typescript
const buffer = new Uint8Array([0x00, 0x01]); // アップロードするデータ

// アセットの識別子はアプリIDから作成できます
const assetId = APP.id.join('asset0');

// 文字列で指定することもできます
// const assetId = 'com.example:asset0';

// アップロード
await omu.assets.upload(assetId, buffer);

// ダウンロード
const { buffer } = await omu.assets.download(assetId);

console.log(buffer); // Uint8Array([0x00, 0x01])
```
