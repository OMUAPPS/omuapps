---
index: 20
icon: database
title: レジストリ
description: データを保持するためのAPI
---

# レジストリ

## 概要

データをアプリ間で同期・保持する事ができます

## 定義

レジストリは`omu.registries.json<T>(name, { default: ... })`から定義できます

- T?: データの型
- name: レジストリの名前。同じ名前で複数のレジストリを作ることはできません
- default: レジストリの初期値を設定

`omu.registries.serialized<T>(name, { default: ..., serializer: ... })`ではバイト配列として処理したい場合に使えます。[シリアライザ](%DOCS_ROOT%/api/serializer)を指定する必要があります

以下が定義例です

```typescript
type MyData = {
    name: string;
    age: number;
};

// レジストリの定義
const myData = omu.registries.json<MyData>('my_data', {
    // データの初期値
    default: {
        name: 'Taro Yamada',
        age: 20,
    },
});
```

jsonであっても[serializer](%DOCS_ROOT%/api/serializer) を指定することで値のシリアライズをカスタマイズできます

```typescript
// レジストリの定義
const myData = omu.registries.serialized<MyData>('my_data', {
    // データの初期値
    default: {
        name: 'Taro Yamada',
        age: 20,
    },
    // シリアライザ
    serializer: mySerializer,
});
```

## データの取得

`.get()`メソッドを使って値を取得します

```typescript
// データの取得
const data = myData.value;

// .get() メソッドを使って値を取得することもできます
const data = await myData.get();
```

## データの更新

`.set(value)`, `.modify(modifier)`, `.update(updater)` メソッドを使って値を更新します

- value: 新しく設定する値
- modifier: 引数にデータを受け取りデータを変更する関数
- updater: 引数にデータを受け取り新しいデータを返す関数

```typescript
// 値を上書きする
// 新しいデータを引数に渡すことで更新します
await myData.set({
    name: 'Taro Yamada',
    age: 21,
});

// 値を変更する
// 引数の関数でデータを変更することで更新します
const modifiedValue = await myData.modify((data) => {
    data.age++;
});

// 値を更新する
// 引数の関数でデータを変更して新しいデータを返すことで更新します
const updatedValue = await myData.update((data) => {
    return {
        ...data,
        age: data.age + 1,
    };
});
```

## 値の監視

データの変更を監視することができます。

```typescript
// 値の監視
myData.listen((data) => {
    console.log(data);
});
```
