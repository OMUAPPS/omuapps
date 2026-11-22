import type { Chat, Models } from '@omujs/chat';
import type { Identifier, Omu } from '@omujs/omu';

export class ProviderTemporarilyUnavailable extends Error {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'ProviderTemporarilyUnavailable';
    }
}

export interface ChannelActivity {
    isActive(id: Identifier): boolean;
}

export class ProviderContext {
    public constructor(
        public readonly omu: Omu,
        public readonly chat: Chat,
        private readonly activity: ChannelActivity,
    ) {}

    public isChannelActive(id: Identifier): boolean {
        return this.activity.isActive(id);
    }
}

export interface ChatProvider {
    readonly provider: Models.Provider;
    startUrl(url: string): Promise<void>;
    startChannel(channel: Models.Channel): Promise<void>;
    stopChannel(channel: Models.Channel): Promise<void>;
    stopRoom(room: Models.Room): Promise<void>;
    isOnline(room: Models.Room): Promise<boolean>;
}

export type ChatProviderFactory = (context: ProviderContext) => ChatProvider[];
