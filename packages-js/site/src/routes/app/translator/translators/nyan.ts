import { Content, type Component, type Message } from '@omujs/chat/models';
import type { Translator } from './translator';

export class NyanTranslator implements Translator {
    constructor(
    ) {}

    id = 'nyan';
    name = 'にゃんにゃん翻訳😽🐾';

    translate(message: Message): Message {
        if (message.content) {
            message.content = Content.transform(message.content, (component) => this.transform(component));
        }
        return message;
    }

    private transform(component: Component): Component {
        if (component.type !== 'text') return component;
        return {
            type: 'text',
            data: component.data.replace('な', 'にゃ').replace('ナ', 'ニャ'),
        };
    }
}
