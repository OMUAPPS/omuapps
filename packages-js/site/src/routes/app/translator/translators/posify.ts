import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { Content, type Component, type Message } from '@omujs/chat/models';
import { isAsciiSymbol, isEmoji } from '../character-helper';
import type { Translator } from './translator';

export class PosifyTranslator implements Translator {
    constructor(
        private readonly tokenizer: Tokenizer,
    ) {}

    id = 'posify';
    name = '[品詞]翻訳❗';

    translate(message: Message): Message {
        if (message.content) {
            message.content = Content.transform(message.content, (component) => this.transform(component));
        }
        return message;
    }

    private transform(component: Component): Component {
        if (component.type !== 'text') return component;
        let data = '';
        for (const token of this.tokenizer.tokenize(component.data)) {
            if (isAsciiSymbol(token.surface_form) || isEmoji(token.surface_form) || token.pos === '記号') {
                data += token.surface_form;
            } else {
                data += `[${token.pos}]`;
            }
        }
        return {
            type: 'text',
            data,
        };
    }
}
