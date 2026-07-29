# @omujs/chat

OMUを通してチャット機能を提供するパッケージです。

## Usage

```typescript
...
import { Chat, ChatEvents } from '@omujs/chat';

const chat = Chat.create(omu);

const unlistenMessage = chat.on(ChatEvents.Message.Add, async (message) => {
    console.log(`New message created: ${message.text}`);
});
chat.on(ChatEvents.Room.Add, (room) => {
    console.log(`New room created: ${room.metadata.title}`);
});

function cleanup() {
    unlistenMessage();
}
```
