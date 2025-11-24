---
index: 20
icon: bell
title: シグナル
description: シグナルを使って他のセッションに通知する
---

# シグナル

## 概要

シグナルは他のセッションと通信するために使います。

## 定義

```typescript
type MySignal = {
    field1: string;
    field2: number;
}

// シグナルの定義
const mySignal = omu.signals.create<MySignal>('my_signal');
```

## シグナルの送信

```typescript
// シグナルを送信する
await mySignal.notify({
    field1: 'Hello',
    field2: 123,
});
```

## シグナルの受信

```typescript
// シグナルを受信する
mySignal.listen((signal) => {
    console.log(signal.field1);
    console.log(signal.field2);
});
```
