import type { Message } from '@omujs/chat/models';

export interface Translator {
    id: string;
    name: string;
    translate(message: Message): Message;
}
