---
index: 1
icon: adjustments-bolt
title: Serializer
group: オブジェクト
description: シリアライザを使ってオブジェクトをバイト列に変換する
---

# シリアライザ

## 概要

シリアライザを使うことで、オブジェクトをバイト列に変換してオブジェクトを保存したり、他のセッションに送信することができます。
これにより、オブジェクトを保存する際にJSONに対応した文字列に変換する必要がなくなるため、データ量の節約や高速化が期待できます。

## Serializable型

２つのメソッド`serialize`, `deserialize`を実装することでシリアライザを定義できます。

```typescript
export interface Serializable<T, D> {
    serialize(data: T): D;
    deserialize(data: D): T;
}
```

## シリアライザの作成

シリアライザを作成するにあたって、すべて自前で実装することもできますが、`ByteReader`, `ByteWriter`を使うことで簡単にバイト列を扱うことができます。

```typescript
import type { Serializable } from '@omujs/omu';
import { ByteReader, ByteWriter } from '@omujs/omu'; // バイト列を扱うためのユーティリティ

type MyData = {
    byteArray: Uint8Array;
    date: Date;
};

const mySerializer: Serializable<MyData, Uint8Array> = {
    serialize(data) {
        const writer = new ByteWriter();
        writer.writeByteArray(data.byteArray);
        writer.writeString(data.date.toISOString());
        return writer.finish(); // バイト列を返す
    },
    deserialize(data) {
        const reader = new ByteReader(data);
        const byteArray = reader.readByteArray();
        const date = new Date(reader.readString());
        reader.finish(); // 読み切ったことを確認
        return { byteArray, date };
    },
};
```

## 使用例

例としてsignal機能をシリアライザと組み合わせて使う方法を示します。

```typescript
const DEFAULT_MY_DATA: MyData = {
    byteArray: new Uint8Array(),
    date: new Date(),
};

const mySignal = omu.signals.create<MyData>('my_data', {
    serializer: mySerializer,
});

await mySignal.notify({
    byteArray: new Uint8Array([1, 2, 3]),
    date: new Date(),
})

mySignal.listen((data: MyData) => {
    console.log(data.byteArray);
    console.log(data.date);
});
```
