import { ChatEvents, type Chat } from '@omujs/chat';
import type { Message, Room } from '@omujs/chat/models';
import type { Omu } from '@omujs/omu';
import { TableType, type Table } from '@omujs/omu/api/table';
import { SvelteMap } from 'svelte/reactivity';
import { APP_ID } from './app.js';

type CountedMessage = {
    id: string;
    roomId: string;
};

const COUNTED_MESSAGES_TABLE = TableType.createJson<CountedMessage>(APP_ID, {
    name: 'counted_messages',
    key: (message) => message.id,
});

export class CommentCounter {
    private readonly connectedRooms = new SvelteMap<string, Room>();
    private readonly counts = new SvelteMap<string, number>();
    private readonly countedMessages = new Map<string, CountedMessage>();
    private readonly messages: Table<CountedMessage>;

    constructor(omu: Omu, private readonly chat: Chat) {
        this.messages = omu.tables.get(COUNTED_MESSAGES_TABLE);
        this.messages.on('add', (items) => this.addCountedMessages(items));
        this.messages.on('remove', (items) => this.removeCountedMessages(items));
        this.messages.on('clear', () => this.clearCountedMessages());
        this.messages.listen();
        chat.on(ChatEvents.Room.AddBatch, (items) => this.updateRooms(items));
        chat.on(ChatEvents.Room.UpdateBatch, (items) => this.updateRooms(items));
        chat.on(ChatEvents.Room.RemoveBatch, (items) => this.removeRooms(items));
        chat.on(ChatEvents.Message.Add, (message) => this.countMessage(message));
    }

    get rooms(): Room[] {
        return [...this.connectedRooms.values()];
    }

    get total(): number {
        return this.rooms.reduce(
            (sum, room) => sum + (this.counts.get(room.key()) ?? 0),
            0,
        );
    }

    getCount(room: Room): number {
        return this.counts.get(room.key()) ?? 0;
    }

    async initialize(): Promise<void> {
        const [rooms, messages] = await Promise.all([
            this.chat.rooms.fetchAll(),
            this.messages.fetchAll(),
        ]);
        this.updateRooms(rooms);
        this.addCountedMessages(messages);
    }

    reset(): void {
        void this.messages.clear();
    }

    private updateRooms(items: Map<string, Room>): void {
        for (const room of items.values()) {
            if (room.connected) {
                this.connectedRooms.set(room.key(), room);
                if (!this.counts.has(room.key())) this.counts.set(room.key(), 0);
            } else {
                this.connectedRooms.delete(room.key());
            }
        }
    }

    private removeRooms(items: Map<string, Room>): void {
        for (const room of items.values()) this.connectedRooms.delete(room.key());
    }

    private countMessage(message: Message): void {
        const roomId = message.roomId.key();
        if (!message.deleted && this.connectedRooms.has(roomId)) {
            void this.messages.add({ id: message.key(), roomId });
        }
    }

    private addCountedMessages(items: Map<string, CountedMessage>): void {
        for (const [id, message] of items) {
            if (this.countedMessages.has(id)) continue;
            this.countedMessages.set(id, message);
            this.counts.set(message.roomId, (this.counts.get(message.roomId) ?? 0) + 1);
        }
    }

    private removeCountedMessages(items: Map<string, CountedMessage>): void {
        for (const id of items.keys()) {
            const message = this.countedMessages.get(id);
            if (!message) continue;
            this.countedMessages.delete(id);
            this.counts.set(message.roomId, Math.max(0, (this.counts.get(message.roomId) ?? 0) - 1));
        }
    }

    private clearCountedMessages(): void {
        this.countedMessages.clear();
        this.counts.clear();
    }
}
