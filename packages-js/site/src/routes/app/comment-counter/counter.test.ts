import type { Chat } from '@omujs/chat';
import { ChatEvents } from '@omujs/chat';
import type { Message, Room } from '@omujs/chat/models';
import type { Omu } from '@omujs/omu';
import type { Table, TableEvents } from '@omujs/omu/api/table';
import { describe, expect, test } from 'vitest';
import { CommentCounter } from './counter.js';

describe('CommentCounter', () => {
    test('shares unique messages and resets through the table', async () => {
        const tableListeners = new Map<keyof TableEvents<unknown>, (...args: any[]) => void>();
        const table = {
            on: (event: keyof TableEvents<unknown>, listener: (...args: any[]) => void) => {
                tableListeners.set(event, listener);
                return () => {};
            },
            listen: () => () => {},
            fetchAll: async () => new Map(),
            add: async (message: { id: string; roomId: string }) => {
                tableListeners.get('add')?.(new Map([[message.id, message]]));
            },
            clear: async () => tableListeners.get('clear')?.(),
        } as unknown as Table<unknown>;
        const omu = { tables: { get: () => table } } as unknown as Omu;
        const chatListeners = new Map<unknown, (...args: any[]) => void>();
        const room = {
            connected: true,
            key: () => 'room',
        } as Room;
        const chat = {
            rooms: { fetchAll: async () => new Map([['room', room]]) },
            on: (event: unknown, listener: (...args: any[]) => void) => {
                chatListeners.set(event, listener);
                return () => {};
            },
        } as unknown as Chat;
        const counter = new CommentCounter(omu, chat);
        await counter.initialize();

        const message = {
            roomId: { key: () => 'room' },
            key: () => 'message',
        } as Message;
        chatListeners.get(ChatEvents.Message.Add)?.(message);
        chatListeners.get(ChatEvents.Message.Add)?.(message);
        expect(counter.total).toBe(1);

        counter.reset();
        expect(counter.total).toBe(0);
    });
});
