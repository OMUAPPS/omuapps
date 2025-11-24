---
index: 24
icon: layout-dashboard
title: ダッシュボード
description: 管理画面API
---

# ダッシュボード

## 概要

ブラウザの音声認識やブラウザ操作をし認証情報を管理することができます

## ドラッグ＆ドロップ

ファイルのドラッグ＆ドロップを処理するには、`requestDragDrop()`メソッドを使用します

```typescript
const drag = await omu.dashboard.requestDragDrop();

// ファイルがドロップされたときの処理
drag.onDrop(async (event) => {
    console.log(event.drag_id); // ドラッグID
    
    const file = event.files[0]; // ファイルの配列から最初のファイルを取得
    console.log(file.name);     // ファイル名
    console.log(file.size);     // ファイルサイズ
    console.log(file.type);     // ファイルタイプ
    
    // ドラッグされた内容を読み込む
    const { meta, files } = await drag.read(event.drag_id);
    console.log(meta.files);    // event.filesと同様
    
    // ファイル内容にアクセス
    console.log(files['ファイル名'].buffer); // Uint8Arrayのファイル内容
    console.log(files['ファイル名'].file === file); // 元のファイルオブジェクトとの比較
});

// ファイルが管理画面上に入ったときの処理
drag.onEnter((event) => {
    console.log('ファイルが管理画面上に入りました', event);
});

// ファイルが管理画面から離れたときの処理
drag.onLeave((event) => {
    console.log('ファイルが管理画面から離れました', event);
});
```

## WebView

外部Webページを管理画面内で表示して管理するには、requestWebview()メソッドを使用します

```typescript
const webview = await omu.dashboard.requestWebview({
    url: 'https://omuapps.com', // 表示するURL
    script: 'console.log("Hello, ${location.host}")', // ページ読み込み時に実行されるスクリプト
});

// クッキーを取得
const cookies = await webview.getCookies();
console.log(cookies[0].name);  // クッキー名
console.log(cookies[0].value); // クッキー値

// WebViewが閉じられるのを待機
await webview.join();

// WebViewを強制的に閉じる
await webview.close();
```

## 音声認識

音声認識機能を使用するには、requestSpeechRecognition()メソッドを使用します

```typescript
const speechRecognition = await omu.dashboard.requestSpeechRecognition();

speechRecognition.listen((state) => {
    switch (state.type) {
        case 'audio_started':
            // 音声入力開始
            console.log('音声入力開始:', state.timestamp);
            break;
            
        case 'audio_ended':
            // 音声入力終了
            console.log('音声入力終了:', state.timestamp);
            break;
            
        case 'result':
            // 中間認識結果
            console.log('中間結果:', state.segments);
            break;
            
        case 'final':
            // 最終認識結果
            console.log('最終結果:', state.segments);
            console.log('認識文字列:', state.segments[0].transcript);
            break;
    }
});
```
