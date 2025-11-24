---
index: 23
icon: photo-scan
title: アセット
description: アセットでファイルとして保持
---

# アセット

## 概要

大きいデータをファイルとして保持する事ができます

`.upload(id, buffer)`を使ってアップロードできます
`.download(id)`を使ってダウンロードできます

- id: アセットの識別子
- buffer: アセットのUint8Arrayで表された内容

```typescript
const buffer = new Uint8Array(...);

const id = await omu.assets.upload("com.example:asset0", buffer);

const { identifier, buffer } = await omu.assets.download(id);
```
