---
index: 21
icon: bell
title: シグナル
description: シグナルを使って他のセッションに通知する
---

# シグナル

## 概要

アプリ間で任意のデータで通知し合う事ができます

## 定義

`omu.signals.json<T>(name)`から定義することができます

- T?: メッセージの型
- name: シグナルの名前。同じ名前で複数のシグナルを作ることはできません

以下が定義例です

```typescript
type MySignal = {
    field1: string;
    field2: number;
}

// シグナルの定義
const mySignal = omu.signals.json<MySignal>('my_signal');
```

## シグナルの送信

`.notify(body)`

- body: 送るメッセージ

```typescript
// シグナルを送信する
await mySignal.notify({
    field1: 'Hello',
    field2: 123,
});
```

## シグナルの受信

`.listen(callback)`

- callback: データを引数に取る関数

```typescript
// シグナルを受信する
mySignal.listen((signal) => {
    console.log(signal.field1);
    console.log(signal.field2);
});
```
