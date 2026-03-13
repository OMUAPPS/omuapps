import { tokenReplaces, type TokenReplacement } from '$lib/token-helper';
import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { Content, type Component, type Message } from '@omujs/chat/models';
import type { Translator } from './translator';

const REPLACEMENTS: TokenReplacement[] = [
    {
        patterns: [
            {
                kind: 'optional',
                'pos': '助詞',
                'pos_detail_1': '格助詞',
                'pos_detail_2': '連語',
                'basic_form': 'って',
            },
            {
                kind: 'include',
                'pos': '名詞',
                'pos_detail_1': '非自立',
                'pos_detail_2': '一般',
                'basic_form': 'こと',
            },
            {
                kind: 'optional',
                'surface_form': '？',
                'pos': '記号',
                'pos_detail_1': '一般',
            },
        ],
        replace: 'ってコト!?',
    },
];

export class ChiikawaTranslator implements Translator {
    constructor(
        private readonly tokenizer: Tokenizer,
    ) {}

    id = 'chiikawa';
    name = 'ちいかわ構文ってコト!?';

    translate(message: Message): Message {
        if (message.content) {
            message.content = Content.transform(message.content, (component) => this.transform(component));
        }
        return message;
    }

    private transform(component: Component): Component {
        if (component.type !== 'text') return component;
        let data = '';
        const tokens = this.tokenizer.tokenize(component.data);
        data = tokenReplaces(tokens, REPLACEMENTS);
        return {
            type: 'text',
            data,
        };
    }
}
