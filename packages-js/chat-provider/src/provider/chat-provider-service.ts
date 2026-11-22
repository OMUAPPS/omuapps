import { Chat, ChatEvents, type Models } from '@omujs/chat';
import { App, Identifier, type Omu, VERSION } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';

import { ChannelController } from './channel-controller.js';
import { type ChatProvider, type ChatProviderFactory, ProviderContext } from './chat-provider.js';
import { RoomCheck } from './room-check.js';

export class ChatProviderService {
    public static readonly ID: Identifier = new Identifier('com.omuapps', 'chatprovider');
    public static readonly APP: App = new App(ChatProviderService.ID, { type: 'plugin', version: VERSION });
    public static readonly START_FROM_URL: EndpointType<string, null> = EndpointType.createJson<string, null>(ChatProviderService.ID, {
        name: 'start_from_url',
        permissionId: ChatProviderService.ID,
    });
    public static readonly STOP_ROOM: EndpointType<string, null> = EndpointType.createJson<string, null>(ChatProviderService.ID, {
        name: 'stop_room',
        permissionId: ChatProviderService.ID,
    });
    private static readonly RECHECK_INTERVAL_MS = 15_000;

    public readonly chat: Chat;
    private readonly providers = new Map<string, ChatProvider>();
    private readonly controller = new ChannelController(this.providers);
    private readonly context: ProviderContext;
    private readonly roomCheck = new RoomCheck(this.controller);
    private recheck: ReturnType<typeof setTimeout> | undefined;
    private running = false;

    public constructor(
        private readonly omu: Omu,
        private readonly createProviders: ChatProviderFactory,
    ) {
        this.chat = Chat.create(omu);
        this.context = new ProviderContext(omu, this.chat, this.controller);
        this.chat.on(ChatEvents.Channel.Add, (channel) => this.controller.update(channel));
        this.chat.on(ChatEvents.Channel.Update, (channel) => this.controller.update(channel));
        this.chat.on(ChatEvents.Channel.Remove, (channel) => this.controller.remove(channel));
        this.chat.on(ChatEvents.Room.Remove, (room) => this.stopRoom(room));
        omu.endpoints.bind(ChatProviderService.START_FROM_URL, async (url) => {
            for (const provider of this.providers.values()) {
                await provider.startUrl(url);
            }
            return null;
        });
        omu.endpoints.bind(ChatProviderService.STOP_ROOM, async (id) => {
            const room = await this.chat.rooms.get(id);
            if (room) await this.stopRoom(room);
            return null;
        });
        omu.onReady(() => {
            void this.ready();
        });
    }

    public stop(): void {
        this.running = false;
        clearTimeout(this.recheck);
    }

    private async ready(): Promise<void> {
        this.providers.clear();
        for (const provider of this.createProviders(this.context)) {
            this.providers.set(provider.provider.id.key(), provider);
            await this.chat.providers.add(provider.provider);
        }
        await this.controller.bootstrap((await this.chat.channels.fetchAll()).values());
        if (!this.running) {
            this.running = true;
            this.scheduleRecheck();
        }
        console.info('Chat provider is ready');
    }

    private scheduleRecheck(): void {
        if (!this.running) return;
        const delay = ChatProviderService.RECHECK_INTERVAL_MS - (Date.now() % ChatProviderService.RECHECK_INTERVAL_MS);
        this.recheck = setTimeout(async () => {
            try {
                await this.controller.refresh();
                await this.checkRooms();
            } catch (error) {
                console.error('Error while rechecking channels and rooms', error);
            }
            this.scheduleRecheck();
        }, delay);
    }

    private async checkRooms(): Promise<void> {
        const rooms = await this.chat.rooms.fetchItems({ limit: 64, backward: true });
        for (const room of rooms.values()) {
            if (!room.connected) continue;
            const provider = this.providers.get(room.providerId.key());
            if (!provider) continue;
            if (!await this.roomCheck.shouldRemove(room, provider)) continue;
            await this.stopRoom(room);
        }
    }

    private async stopRoom(room: Models.Room): Promise<void> {
        room.status = 'offline';
        room.connected = false;
        await this.chat.rooms.update(room);
        await this.providers.get(room.providerId.key())?.stopRoom(room);
    }
}
