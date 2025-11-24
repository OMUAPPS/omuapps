---
index: 25
icon: http-get
title: HTTP
description: HTTPやWebSocketを使って接続
---

# HTTP

## 概要

ブラウザの制限を超えてHTTPリクエストを送信したりWebSocketを開く事ができます

## HTTPリクエスト

`fetch()`メソッドを使用してHTTPリクエストを送信できます。このメソッドは標準の`window.fetch`と同じ引数を受け取り、返り値も同様の扱いができます

```typescript
// HTTP GETリクエストの例
const resp = await omu.http.fetch('https://omuapps.com/apps.json');
const data = await resp.json();
console.log(data); // レスポンスデータ
```

## WebSocket接続

WebSocket接続には`ws()`メソッドを使用します。2通りの使用方法があります

### 方法1: シンプルなメッセージループ

イベントの順序を気にせず簡単に操作できます

```typescript
const socket = await omu.http.ws('wss://echo.websocket.org');

// メッセージ送信
socket.send('Hello, world!');

// メッセージ受信ループ
while (true) {
    const msg = await socket.receive();
    
    if (msg.type === 'close') {
        console.log('接続が閉じられました');
        break;
    }
    
    if (msg.type === 'text') {
        console.log('受信メッセージ:', msg.data); // "Hello, world!"
    }
    
    if (msg.type === 'binary') {
        console.log('バイナリデータ受信:', msg.data);
    }
}
```

### 方法2: 標準WebSocketインターフェース

`.toWebSocket()`メソッドで標準のWebSocketオブジェクトとして扱うこともできます

```typescript
const ws = await omu.http.ws('wss://echo.websocket.org');
const webSocket = ws.toWebSocket();

webSocket.onopen = () => {
    console.log('WebSocket接続が開きました');
    webSocket.send('Hello, world!');
};

webSocket.onmessage = (message) => {
    console.log('受信メッセージ:', message.data);
};

webSocket.onclose = () => {
    console.log('WebSocket接続が閉じました');
};

webSocket.onerror = (error) => {
    console.error('WebSocketエラー:', error);
};
```
