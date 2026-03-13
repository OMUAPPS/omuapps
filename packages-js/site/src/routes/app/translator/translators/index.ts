import { dev } from '$app/environment';
import { Tokenizer } from '@2ji-han/kuromoji.js/tokenizer.js';
import { ChiikawaTranslator } from './chiikawa';
import { NyanTranslator } from './nyan';
import { OjisanTranslator } from './ojisan';
import { PosifyTranslator } from './posify';
import type { Translator } from './translator';

export function getTranslators(tokenizer: Tokenizer): Translator[] {
    const translators: Translator[] = [
        new PosifyTranslator(tokenizer),
        new NyanTranslator(),
    ];
    if (dev) {
        translators.push(new OjisanTranslator(tokenizer));
        translators.push(new ChiikawaTranslator(tokenizer));
    }
    return translators;
}
