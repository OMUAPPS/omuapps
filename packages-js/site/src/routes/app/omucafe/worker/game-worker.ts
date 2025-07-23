import type { TOKEN } from '@2ji-han/kuromoji.js/util/ipadic-formatter.js';
import { BROWSER } from 'esm-env';
import GameWorker from './game-worker.worker.js?worker';
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

export async function getWorker(): Promise<WorkerPipe<GameCommands>> {
    if (!BROWSER) return WorkerPipe.dummy<GameCommands>();
    const worker = WorkerPipe.create<GameCommands>(new GameWorker());
    await new Promise<void>((resolve) => {
        worker.bind('ready', () => {
            resolve();
            return Promise.resolve();
        });
    });
    return worker;
}
