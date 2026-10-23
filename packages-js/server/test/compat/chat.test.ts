import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { Chat, ChatPermissions, Models } from '@omujs/chat';
import { App, Identifier } from '@omujs/omu';

import { TestClients } from './test-clients.js';
import { PythonTestServer, type TestServer, TypeScriptTestServer } from './test-server.js';

const SERVERS: (() => TestServer)[] = [
    () => new PythonTestServer(),
    () => new TypeScriptTestServer(),
];

class ChatFixture {
    public static message(room: Identifier, id: string, text: string): Models.Message {
        return new Models.Message({
            roomId: room,
            id: room.join(id),
            content: { type: 'text', data: text },
            createdAt: new Date(),
        });
    }
}

for (const createServer of SERVERS) {
    const server = createServer();

    describe(`${server.name} server chat`, () => {
        const clients = new TestClients(server);

        beforeAll(async () => {
            await server.start();
        }, 180_000);

        afterAll(async () => {
            clients.stop();
            await server.stop();
        });

        test('lets an app write messages that another app reads', async () => {
            const writerApp = new App('com.example:chat-writer', { version: '1.0.0' });
            let writer: Chat | undefined;
            await clients.connect(writerApp, (omu) => {
                writer = Chat.create(omu);
            }, [ChatPermissions.CHAT_PERMISSION_ID]);
            const room = new Identifier('com.example', 'chat-writer', 'room');
            await writer?.messages.add(ChatFixture.message(room, 'first', 'hello'));

            const readerApp = new App('com.example:chat-reader', { version: '1.0.0' });
            let reader: Chat | undefined;
            await clients.connect(readerApp, (omu) => {
                reader = Chat.create(omu);
            }, [ChatPermissions.CHAT_PERMISSION_ID]);
            const message = await reader?.messages.get(room.join('first').key());
            expect(message?.text).toBe('hello');
        }, 60_000);

        test('accepts an app requiring the chat plugins', async () => {
            const omu = await clients.connect(TestClients.app('chat-plugins'), (client) => {
                client.plugins.require({ omu_chat: '>=0.10.0', omu_chatprovider: '>=0.10.0' });
            });
            expect(omu.ready).toBe(true);
        }, 60_000);
    });
}
