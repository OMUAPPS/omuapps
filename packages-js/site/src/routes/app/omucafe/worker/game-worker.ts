import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import TestWorker from './game-worker.worker?worker';
import { WorkerPipe } from './worker.js';

export type GameCommands = {
    tokenize: {
        request: string,
        response: TOKEN[],
    },
    ready: {
        request: void,
        response: void,
    },
}

export async function getWorker() {
    const worker = WorkerPipe.create<GameCommands>(new TestWorker());
    await new Promise<void>((resolve) => {
        worker.bind('ready', () => {
            resolve();
            return Promise.resolve();
        });
    });
    return worker;
}
