---
index: 19
icon: message
title: チャット
description: 配信サイトのチャットや配信情報を利用する
---

# チャット

## 概要

`@omujs/chat`を使うと、YouTubeなどの配信サイトから取得したチャット、投稿者、チャンネル、配信枠などの情報を利用できます。

チャットの各データは[テーブル](%DOCS_ROOT%/api/table)として提供されます。過去のデータを取得できるほか、追加や更新をイベントとして受け取ることもできます。

## セットアップ

`Chat.create(omu)`でチャットAPIを作成します。

チャットAPIは必要なセッションと権限を登録するため、必ず`omu.start()`より前に作成してください。

```typescript
import { Chat, ChatEvents, Models } from '@omujs/chat';
import { Omu } from '@omujs/omu';
import { APP } from './app';

const omu = new Omu(APP);
const chat = Chat.create(omu);

const unlistenMessage = chat.on(ChatEvents.Message.Add, (message) => {
    console.log(message.text);
});

omu.start();

// 画面を閉じるときなど、購読が不要になったら解除します
function destroy() {
    unlistenMessage();
}
```

## チャットを受け取る

`chat.on(event, handler)`でチャットデータの追加、更新、削除を受け取ります。戻り値の関数を呼び出すと、登録したハンドラーを解除できます。

`chat.on()`が対象テーブルの購読も開始するため、Batchイベントを含めて`table.listen()`を別途呼ぶ必要はありません。

```typescript
const unlisten = chat.on(ChatEvents.Message.Add, async (message) => {
    const author = message.authorId
        ? await chat.authors.get(message.authorId.key())
        : undefined;

    console.log(`${author?.name ?? '不明'}: ${message.text}`);
});

// 購読が不要になった時点で呼び出します
function destroy() {
    unlisten();
}
```

イベントはデータの種類ごとに用意されています。

| データ | イベント |
| --- | --- |
| メッセージ | `ChatEvents.Message` |
| 投稿者 | `ChatEvents.Author` |
| チャンネル | `ChatEvents.Channel` |
| プロバイダー | `ChatEvents.Provider` |
| 配信枠 | `ChatEvents.Room` |
| 投票 | `ChatEvents.Vote` |

それぞれのイベントから、次の変更を監視できます。

| イベント | 内容 | ハンドラーの引数 |
| --- | --- | --- |
| `Add` | データが追加された | 追加されたデータ |
| `Update` | データが更新された | 更新されたデータ |
| `Remove` | データが削除された | 削除されたデータ |
| `AddBatch` | 複数のデータが追加された | `Map<string, T>` |
| `UpdateBatch` | 複数のデータが更新された | `Map<string, T>` |
| `RemoveBatch` | 複数のデータが削除された | `Map<string, T>` |
| `Clear` | テーブルが空になった | なし |

```typescript
chat.on(ChatEvents.Room.Update, (room) => {
    console.log(room.metadata.title, room.status);
});

const unlistenMessages = chat.on(ChatEvents.Message.AddBatch, (messages) => {
    for (const message of messages.values()) {
        console.log(message.text);
    }
});

// 画面を閉じるときなど、購読が不要になったら解除します
function destroy() {
    unlistenMessages();
}
```

## 過去のメッセージを取得する

`chat.messages`は通常のテーブルとして操作できます。

最新のメッセージを取得するには、`fetchItems()`に`backward: true`を指定します。戻り値は、メッセージIDをキーとする`Map`です。

```typescript
const result = await chat.messages.fetchItems({
    limit: 50,
    backward: true,
});

const messages = [...result.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
);
```

リアルタイムのイベントだけでは接続前のメッセージを取得できません。画面の初期表示では、イベントを先に登録してから`fetchItems()`で履歴を読み込みます。IDをキーにした`Map`へ保存すると、履歴の取得中に届いたメッセージも重複せず保持できます。

```typescript
const messages = new Map<string, Models.Message>();

chat.on(ChatEvents.Message.Add, (message) => {
    messages.set(message.id.key(), message);
});

omu.onReady(async () => {
    const history = await chat.messages.fetchItems({
        limit: 50,
        backward: true,
    });

    for (const [id, message] of history) {
        if (!messages.has(id)) {
            messages.set(id, message);
        }
    }
});
```

## メッセージ

メッセージは`Models.Message`として取得できます。

| プロパティ | 型 | 内容 |
| --- | --- | --- |
| `id` | `Identifier` | メッセージの識別子 |
| `roomId` | `Identifier` | 投稿された配信枠 |
| `authorId` | `Identifier \| undefined` | 投稿者の識別子 |
| `createdAt` | `Date` | 投稿日時 |
| `content` | `Component \| undefined` | 装飾を含むメッセージ内容 |
| `text` | `string` | `content`から文字列だけを取り出した内容 |
| `paid` | `Paid \| undefined` | 通貨と金額 |
| `gifts` | `Gift[] \| undefined` | ギフト |
| `deleted` | `boolean \| undefined` | 削除済みかどうか |

`message.content`には、テキストだけでなく画像、リンク、アセットなどが含まれる場合があります。文字列だけが必要な場合は`message.text`を使います。

削除済みのメッセージを表示しない場合は、`deleted`を確認してください。

```typescript
const visibleMessages = [...messages.values()]
    .filter((message) => !message.deleted);
```

## 投稿者を取得する

メッセージには投稿者のIDが保存されています。名前やアイコンが必要な場合は`chat.authors`から取得します。

```typescript
if (message.authorId) {
    const author = await chat.authors.get(message.authorId.key());

    console.log(author?.name);
    console.log(author?.avatarUrl);
    console.log(author?.roles);
}
```

複数の投稿者をまとめて取得する場合は`getMany()`を使います。

```typescript
const authorIds = [...messages.values()]
    .flatMap((message) => message.authorId ? [message.authorId.key()] : []);

const authors = await chat.authors.getMany(...authorIds);
```

## 利用できるテーブル

`Chat`は次のテーブルを提供します。取得や監視、キャッシュなどの詳しい操作方法は[テーブル](%DOCS_ROOT%/api/table)を参照してください。

| プロパティ | データ | 内容 |
| --- | --- | --- |
| `chat.messages` | `Models.Message` | チャットメッセージ |
| `chat.authors` | `Models.Author` | 投稿者 |
| `chat.channels` | `Models.Channel` | 接続対象のチャンネル |
| `chat.providers` | `Models.Provider` | YouTubeなどのチャットプロバイダー |
| `chat.rooms` | `Models.Room` | 配信枠と接続状態 |
| `chat.votes` | `Models.Vote` | 配信内の投票 |

## チャンネルを追加する

`createChannelTree(url)`でURLに対応するチャンネルを検索し、追加候補を取得できます。実際に接続対象へ追加するには、取得したチャンネルを`chat.channels`へ追加します。

```typescript
const channels = await chat.createChannelTree(
    'https://www.youtube.com/@example',
);

if (channels.length > 0) {
    await chat.channels.add(...channels);
}
```

追加済みか確認する場合は、チャンネルの識別子を使います。

```typescript
for (const channel of channels) {
    const added = await chat.channels.has(channel.id.key());
    console.log(channel.name, added);
}
```

## リアクション

リアクションは`chat.reactionSignal`から送受信できます。

```typescript
import { Models } from '@omujs/chat';

chat.reactionSignal.listen((reaction) => {
    console.log(reaction.roomId, reaction.reactions);
});

await chat.reactionSignal.notify(new Models.Reaction({
    roomId,
    reactions: {
        '👍': 1,
    },
}));
```
