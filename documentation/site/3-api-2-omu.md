---
index: 1
icon: box
title: アプリを作成する
group: API
description: APIの機能を利用するためのアプリを作成する
---

# アプリを作成する

## 概要

APIの機能を利用すためにはまずアプリを作成する必要があります。

## 定義

```typescript
// アプリに関する情報
import { App, Omu } from '@omujs/omu';

// com.example:my_app
// <公開する先のドメイン>:<アプリ名>
// これが一致しないと認証を通過できません
const APP = new App('com.example:my_app', {
    version: '1.0.0',
    // アプリの説明
    metadata: {
        locale: 'ja',
        name: 'クソコメ警察',
        description: '【2025年最新版】草を生やした人を自動で検出して収集するアプリ',
    },
});

// omuオブジェクトを作成
const omu = new Omu(APP);
```

次のページからは、このomuオブジェクトから利用できるAPIの機能について説明します。
