import type { Author, Message } from '@omujs/chat/models/index.js';

export interface Entry {
  author: Author;
  message: Message;
  element: HTMLElement | null;
}
