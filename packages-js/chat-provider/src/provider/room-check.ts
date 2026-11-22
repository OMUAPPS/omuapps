import type { Models } from '@omujs/chat';
import { Identifier } from '@omujs/omu';

import { type ChannelActivity, type ChatProvider, ProviderTemporarilyUnavailable } from './chat-provider.js';

export class RoomCheck {
    public constructor(private readonly activity: ChannelActivity) {}

    public async shouldRemove(room: Models.Room, provider: ChatProvider): Promise<boolean> {
        if (room.channelId && !this.activity.isActive(Identifier.fromKey(room.channelId))) return true;
        try {
            return !await provider.isOnline(room);
        } catch (error) {
            if (error instanceof ProviderTemporarilyUnavailable) {
                console.warn(`Could not check room ${room.key()}; keeping connection until next check: ${error.message}`);
                return false;
            }
            console.error(`Error checking if room ${room.key()} should be removed`, error);
            return true;
        }
    }
}
