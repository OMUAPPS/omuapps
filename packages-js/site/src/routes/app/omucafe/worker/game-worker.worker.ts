import kuromoji from '@2ji-han/kuromoji.js';
import { BROWSER } from 'esm-env';
import type { GameCommands } from './game-worker.js';
import { WorkerPipe } from './worker.js';

async function init() {
    const tokenizer = await kuromoji.fromURL('https://coco-ly.com/kuromoji.js/dict/')
    const worker = WorkerPipe.self<GameCommands>();
    
    worker.bind('tokenize', async (text: string) => {
        const tokens = tokenizer.tokenize(text)
        self.postMessage({type: 'tokenize', payload: tokens})
        return tokens
    });

    worker.call('ready', undefined);
}

if (BROWSER) {
    init();
}
