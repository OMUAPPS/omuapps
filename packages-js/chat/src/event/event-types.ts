import { Author } from '../models/author.js';
import { Channel } from '../models/channel.js';
import { Message } from '../models/message.js';
import { Provider } from '../models/provider.js';
import { Room } from '../models/room.js';
import { Vote } from '../models/vote.js';
import { TableEvent } from './event.js';

export const events: { message: TableEvent<Message>; author: TableEvent<Author>; channel: TableEvent<Channel>; provider: TableEvent<Provider>; room: TableEvent<Room>; vote: TableEvent<Vote> } = {
    message: new TableEvent((chat) => chat.messages),
    author: new TableEvent((chat) => chat.authors),
    channel: new TableEvent((chat) => chat.channels),
    provider: new TableEvent((chat) => chat.providers),
    room: new TableEvent((chat) => chat.rooms),
    vote: new TableEvent((chat) => chat.votes),
};
