---
index: 22
icon: table
title: テーブル
description: テーブルで大量のデータを管理する
---

# テーブル

## 概要

キーと値のペアでデータを保存します

## 定義

`omu.tables.json<T>(name, options)`から定義することができます

- T?: データの型
- name: テーブルの名前。同じ名前で複数のテーブルを作ることはできません
- options
  - key: 型Tを引数に取り識別子となるキーを返す関数

以下が定義例です

```typescript
type User = {
    id: string;
    name: string;
}

// テーブルの定義
const users = omu.tables.json<User>('users', {
    key: (item) => item.id,
});
```

## アイテムの操作

`.clear()`を使ってすべてのアイテムを削除します

`.add(...items)`, `.update(...items)`を使ってアイテムを追加、編集します

addとupdateはどちらも値を更新しますが、呼び出されるイベントが異なります

`.remove(...items)`を使ってアイテムを削除します

```typescript
// 全削除
await users.clear();

// 追加
await users.add({
    id: 'user-0',
    name: 'foo',
});

// 編集
await users.update({
    id: 'user-0',
    name: 'bar',
});
```

## アイテムの取得

`.fetchAll()`を使ってすべてのアイテムを取得します
`.fetchItems({ limit, backward?, cursor? })`を使って指定した量のアイテムを取得します

- limit: 最大アイテム取得数制限
- backward?: 最後に追加されたアイテムから取得するかどうか
- cursor?: 取得する起点となるアイテムのキー

`.fetchRange({ start, end })`を使って指定した範囲のアイテムを取得します

- start: 取得範囲の最初のキー
- end: 取得範囲の最後のキー

```typescript
// 全取得
const users = await users.fetchAll();

// 最初・最後から指定した数だけ
const lastUsers = await users.fetchItems({
    limit: 10,
    backward: true, // trueの場合後ろ(最後に追加された順)から取得します
    // 指定した場所から取得する場合cursorオプションが使えます
    // cursor: 'user20'
});

// 2つの範囲をすべて取得
const users = await users.fetchRange({
    start: 'user0',
    end: 'user10'
});
```
