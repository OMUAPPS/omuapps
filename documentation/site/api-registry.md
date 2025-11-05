---
index: 20
icon: database
title: レジストリ
group: API
description: データを保持するためのAPI
---

# レジストリ

## 概要

レジストリはデータを保持するために使います。

## 定義

```typescript
type MyData = {
    name: string;
    age: number;
};

// レジストリの定義
const myData = omu.registries.create<MyData>('my_data', {
    // データの初期値
    default: {
        name: 'Taro Yamada',
        age: 20,
    },
});
```

[serializer](%DOCS_ROOT%/4-core-1-serializer) を指定することでデータのシリアライズをカスタマイズすることができます。

```typescript
// レジストリの定義
const myData = omu.registries.create<MyData>('my_data', {
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

```typescript
// データの取得
const data = myData.value;

// .get() メソッドを使ってデータを取得することもできます
const data = await myData.get();
```

## データの更新

`.set()`, `.modify()`, `.update()` メソッドを使ってデータを更新します。

```typescript
// データを上書きする
// 新しいデータを引数に渡すことで更新します
await myData.set({
    name: 'Taro Yamada',
    age: 21,
});

// データを変更する
// 引数の関数でデータを変更することで更新します
const modifiedValue = await myData.modify((data) => {
    data.age++;
});

// データを更新する
// 引数の関数でデータを変更して新しいデータを返すことで更新します
const modifiedValue = await myData.update((data) => {
    return {
        ...data,
        age: data.age + 1,
    };
});
```

## データの監視

データの変更を監視することができます。

```typescript
// データの監視
myData.listen((data) => {
    console.log(data);
});
```
