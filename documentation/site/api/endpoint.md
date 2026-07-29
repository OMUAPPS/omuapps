---
index: 27
icon: arrows-exchange
title: Endpoint
description: アプリ間で型付きの処理を呼び出す
---

# Endpoint

## 定義

```typescript
import { App } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';

const APP = new App('com.example:service', {
    type: 'service',
});

const GREETING = EndpointType.createJson<
    { name: string },
    { message: string }
>(APP, {
    name: 'greeting',
});
```

## 処理を公開する

`bind()`は`omu.start()`より前に呼びます。

```typescript
omu.endpoints.bind(GREETING, async (request) => {
    return {
        message: `こんにちは、${request.name}さん`,
    };
});
```

## 呼び出す

```typescript
const response = await omu.endpoints.call(GREETING, {
    name: 'Taro',
});

console.log(response.message);
```

## 権限を設定する

`permissionId`を指定すると、呼び出し元に権限を要求できます。

```typescript
const PRIVATE_ENDPOINT = EndpointType.createJson(APP, {
    name: 'private',
    permissionId: WRITE_PERMISSION.id,
});
```

JSONで扱えない型は`createSerialized()`と[Serializer](%DOCS_ROOT%/api/serializer)を使います。
