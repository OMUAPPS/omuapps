# @omujs/chat

OMUを通してチャット機能を提供するパッケージです。

## Usage

```typescript
...
import { Chat, events } from '@omujs/chat';

const chat = Chat.create(omu);

chat.on(events.message.add, async (message) => {
    console.log(`New message created: ${message.text}`);
});
chat.on(events.room.add, (room) => {
    console.log(`New room created: ${room.metadata.title}`);
})
```
