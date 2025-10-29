import { Author } from '../models/author.js';
import { Channel } from '../models/channel.js';
import { Message } from '../models/message.js';
import { Provider } from '../models/provider.js';
import { Room } from '../models/room.js';
import { Vote } from '../models/vote.js';
import { TableEvent } from './event.js';

export const events: { Message: TableEvent<Message>; Author: TableEvent<Author>; Channel: TableEvent<Channel>; Provider: TableEvent<Provider>; Room: TableEvent<Room>; Vote: TableEvent<Vote> } = {
    Message: new TableEvent((chat) => chat.messages),
    Author: new TableEvent((chat) => chat.authors),
    Channel: new TableEvent((chat) => chat.channels),
    Provider: new TableEvent((chat) => chat.providers),
    Room: new TableEvent((chat) => chat.rooms),
    Vote: new TableEvent((chat) => chat.votes),
};
