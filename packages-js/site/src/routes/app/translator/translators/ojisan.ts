import { tokenReplaces, type TokenReplacement } from '$lib/token-helper';
import type { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { Content, type Component, type Message } from '@omujs/chat/models';
import type { Translator } from './translator';

// 💡おじさん構文の主な特徴
//     絵文字・顔文字の乱用: 文末や文章の至る所に「😅」「💦」「😆」「‼️」「⁉️」を散りばめる。
//     句読点（、。）の多用: 文章の途中に不自然な箇所で読点「、」が入る（例：今日、は、ラーメン、を、食べたヨ）。
//     カタカナ・小文字: 文章の一部、特に文末や単語をカタカナに変換する（例：〜だネ、〜チャン）。
//     長文・「俺通信」: 相手に聞かれてもいないのに「〇〇ちゃん、お疲れ様！俺はこれから〜」といった日記のような近況報告。
//     「〜チャン」付け: 若い女性相手に親しみを込めて「チャン」や「さん」を付けて呼ぶ。
//     「ナンチャッテ」: 照れ隠しや、セクハラと言われないための予防線として文末に付ける。
// data = data
//     .replace(/。/g, '！')
//     .replace(/、/g, '～')
//     .replace(/！/g, '！😘')
//     .replace(/？/g, '？😳')
//     .replace(/です/g, 'だヨ！')
//     .replace(/ます/g, 'だヨ！')
//     .replace(/だ/g, 'ダヨ！')
//     .replace(/な/g, 'ナノ！')
//     .replace(/ね/g, 'ネ！')
//     .replace(/だろ/g, 'ダロ！')
//     .replace(/だね/g, 'ダネ！')
//     .replace(/だよ/g, 'ダヨ！')
//     .replace(/ですか/g, 'ダヨカ？')
//     .replace(/ますか/g, 'ダヨカ？')
//     .replace(/か/g, 'カナ？');
const REPLACEMENTS: TokenReplacement[] = [
    {
        patterns: [{
            kind: 'include',
            'surface_form': '。',
            'pos': '記号',
            'pos_detail_1': '句点',
            'basic_form': '。',
        }],
        replace: '‼️',
    },
];

export class OjisanTranslator implements Translator {
    constructor(
        private readonly tokenizer: Tokenizer,
    ) {}

    id = 'ojisan';
    name = 'おじさん構文だヨ！😘🍣';

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
