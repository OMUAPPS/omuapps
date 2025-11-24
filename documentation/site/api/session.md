---
index: 26
icon: category-plus
title: セッション
description: セッションを管理
---

# セッション

## 概要

親子関係を持つアプリケーションを作成し、セッションを管理しましょう

## 子アプリケーションの定義

子アプリケーションを作成するには、`parentId`を設定した`App`オブジェクトを定義します

```typescript
// 子アプリケーションの定義
const CHILD_APP = new App('com.omuapps:child', {
    parentId: PARENT_APP, // 親アプリケーションを指定（必須）
    url: 'omuapps.com/app/child', // 子アプリケーションのURL
});
```

## トークンの生成と接続

子アプリケーションに接続するためのトークンを生成します

```typescript
// 子アプリケーション用のトークンを生成
const params = await omu.sessions.generateToken({
    app: CHILD_APP,
    permissions: [
        OmuPermissions.ASSET_PERMISSION_ID, // 必要な権限を指定することで権限の確認をスキップできます
        // その他の権限...
    ],
});

// 生成されたパラメータ
console.log(params.token);  // 子アプリケーション接続用トークン
console.log(params.address); // 接続先アドレス

// 子アプリケーション接続用のURLを作成
const url = new URL('https://omuapps.com/app/child');
url.searchParams.set(BrowserSession.PARAM_NAME, JSON.stringify(params));

// このURLを開くことで子アプリケーションが接続されます
console.log(url.toString());
```

### 注意点

- トークンを生成できるのは子の親アプリであるかつ、子のIDは親のIDより下にある必要があります
- 子は親が持っている権限以上の権限を持つことができません

## セッションの要求と監視

子アプリケーションのセッションを管理するには、以下のメソッドを使用します

```typescript
// 子アプリケーションのセッションを要求
omu.sessions.require(CHILD_APP);

// 子アプリケーションの接続状態を監視
const observer = omu.sessions.observe(CHILD_APP);

// 子アプリケーションが接続されたときの処理
observer.onConnect((app) => {
    console.log(`子アプリケーションが接続されました: ${app.id.key()}`);
});

// 子アプリケーションが切断されたときの処理
observer.onDisconnect((app) => {
    console.log(`子アプリケーションが切断されました: ${app.id.key()}`);
});
```
