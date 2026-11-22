export class ServerProcess {
    public static readonly RESTART_EXIT_CODE = 100;

    public static command(): string[] {
        if (ServerProcess.compiled()) return [process.execPath, ...process.argv.slice(2)];
        return [process.execPath, ...process.argv.slice(1)];
    }

    public static restart(): void {
        const child = Bun.spawn(ServerProcess.command(), {
            cwd: process.cwd(),
            stdio: ['ignore', 'inherit', 'inherit'],
        });
        child.unref();
        console.info(`Restarting server with PID ${child.pid}`);
        process.exit(ServerProcess.RESTART_EXIT_CODE);
    }

    private static compiled(): boolean {
        return Bun.main.includes('$bunfs') || Bun.main.includes('~BUN');
    }
}
