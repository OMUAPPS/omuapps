
type Task = () => Promise<void>;

export class Lock {
    private tasks: (Task)[] = [];
    private waiter: Promise<void> | null = null;

    private wait(): Promise<void> {
        if (this.waiter) {
            return this.waiter;
        }
        this.waiter = new Promise<void>((resolve) => {
            const runTasks = async () => {
                while (this.tasks.length > 0) {
                    const task = this.tasks.shift();
                    if (task) {
                        await task();
                    }
                }
                this.waiter = null;
                resolve();
            };
            runTasks();
        });
        return this.waiter;
    }
    
    public async use<T>(callback: () => Promise<T>): Promise<T> {
        const promise = new Promise<T>((resolve, reject) => {
            const task = async () => {
                const promise = callback();
                try {
                    resolve(await promise);
                } catch (reason) {
                    reject(reason);
                }
            };
            this.tasks.push(task);
        });
        await this.wait();
        return promise;
    }
}
