type CommandRegistry = Record<string, {
    request: unknown,
    response: unknown,
}>;

export class WorkerPipe<Commands extends CommandRegistry> {
    private callbacks: Record<number, (data: unknown) => void> = {};
    private functions: Map<keyof Commands, (payload: Commands[keyof Commands]['request']) => PromiseLike<Commands[keyof Commands]['response']>> = new Map();
    private readyCallbacks: (() => void)[] = [];
    private callId = 0;

    private constructor(
        private setOnMessage: (fn: (event: MessageEvent) => void) => void,
        private postMessage: (data: unknown) => void,
    ) {
        this.setOnMessage(async ({ data }) => {
            const { id, type, payload } = data;
            if (type === 'response') {
                this.callbacks[id](payload);
                delete this.callbacks[id];
            }
            if (type === 'call') {
                const { command } = data;
                const func = this.functions.get(command);
                if (!func) {
                    throw new Error(`Command not found: ${command}`);
                }
                const response = await func(payload);
                postMessage({ id, type: 'response', payload: response });
            }
        });
    }

    public static create<Commands extends CommandRegistry>(worker: Worker): WorkerPipe<Commands> {
        return new WorkerPipe<Commands>(
            (fn) => worker.onmessage = fn,
            (data) => worker.postMessage(data),
        );
    }

    public static self<Commands extends CommandRegistry>(): WorkerPipe<Commands> {
        return new WorkerPipe<Commands>(
            (fn) => self.onmessage = fn,
            (data) => self.postMessage(data),
        );
    }

    public async call<K extends keyof Commands>(command: K, payload: Commands[K]['request']): Promise<Commands[K]['response']> {
        return new Promise((resolve) => {
            const id = this.callId++;
            this.callbacks[id] = resolve;
            this.postMessage({ id, type: 'call', command, payload });
        });
    }

    public bind<K extends keyof Commands>(command: K, fn: (payload: Commands[K]['request']) => PromiseLike<Commands[K]['response']>) {
        if (this.functions.has(command)) {
            throw new Error(`Command already bound: ${String(command)}`);
        }
        this.functions.set(command, fn);
    }
}
