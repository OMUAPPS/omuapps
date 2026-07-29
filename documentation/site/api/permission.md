---
index: 11
icon: lock
title: 権限
description: アプリが利用する機能を要求する
---

# 権限

## 概要

アプリは、ファイル、OBS、チャットなど利用者へ影響する機能を使う前に権限を要求します。

権限は必ず`omu.start()`より前に登録してください。

```typescript
import { OmuPermissions } from '@omujs/omu';

omu.permissions.require(
    OmuPermissions.ASSET_PERMISSION_ID,
    OmuPermissions.HTTP_REQUEST_PERMISSION_ID,
);

omu.start();
```

接続開始後に未取得の権限を`require()`するとエラーになります。

## 権限を確認する

```typescript
const granted = omu.permissions.has(
    OmuPermissions.ASSET_PERMISSION_ID,
);
```

## 独自の権限を定義する

Endpointなどアプリ独自機能を公開する場合は`PermissionType`を登録できます。

```typescript
import { Identifier } from '@omujs/omu';
import { PermissionType } from '@omujs/omu/api/permission';

const WRITE_PERMISSION = PermissionType.create(
    new Identifier('com.example', 'sample', 'write'),
    {
        metadata: {
            level: 'medium',
            name: {
                ja: 'サンプルデータを変更',
                en: 'Modify sample data',
            },
        },
    },
);

omu.permissions.register(WRITE_PERMISSION);
```

権限レベルは`low`、`medium`、`high`の3種類です。操作の影響に合わせて設定してください。

## 子アプリの権限

子アプリへトークンを発行するときは、親アプリが持つ権限の範囲内で必要な権限を指定します。詳しくは[セッション](%DOCS_ROOT%/api/session)を参照してください。
