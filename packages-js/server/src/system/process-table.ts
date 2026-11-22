export type ProcessEntry = {
    pid: number;
    name: string;
    exe: string;
};

export interface ProcessTable {
    listeningOn(port: number): Promise<ProcessEntry[]>;
    isRunning(names: readonly string[]): Promise<boolean>;
    terminate(pid: number): void;
}

class WindowsProcessTable implements ProcessTable {
    public async listeningOn(port: number): Promise<ProcessEntry[]> {
        const netstat = await WindowsProcessTable.run(['netstat', '-ano', '-p', 'TCP']);
        const pids = new Set<number>();
        for (const line of netstat.split(/\r?\n/)) {
            const columns = line.trim().split(/\s+/);
            if (columns.length < 5 || columns[3] !== 'LISTENING') continue;
            if (!columns[1].endsWith(`:${port}`)) continue;
            pids.add(Number(columns[4]));
        }
        pids.delete(0);
        if (pids.size === 0) return [];
        const output = await WindowsProcessTable.run([
            'powershell',
            '-NoProfile',
            '-Command',
            `Get-Process -Id ${[...pids].join(',')} -ErrorAction SilentlyContinue | ForEach-Object { "$($_.Id)\`t$($_.ProcessName)\`t$($_.Path)" }`,
        ]);
        return output.split(/\r?\n/).filter(Boolean).map((line) => {
            const [pid, name, exe] = line.split('\t');
            return { pid: Number(pid), name: `${name}.exe`, exe: exe ?? '' };
        });
    }

    public async isRunning(names: readonly string[]): Promise<boolean> {
        const output = await WindowsProcessTable.run(['tasklist', '/FO', 'CSV', '/NH']);
        const running = new Set(output.split(/\r?\n/).map((line) => line.split('","')[0].replace(/^"/, '').toLowerCase()));
        return names.some((name) => running.has(name.toLowerCase()));
    }

    public terminate(pid: number): void {
        Bun.spawnSync(['taskkill', '/PID', String(pid), '/F']);
    }

    private static async run(command: string[]): Promise<string> {
        const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'ignore' });
        const output = await new Response(child.stdout).text();
        await child.exited;
        return output;
    }
}

class PosixProcessTable implements ProcessTable {
    public async listeningOn(port: number): Promise<ProcessEntry[]> {
        const child = Bun.spawn(['lsof', '-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], { stdout: 'pipe', stderr: 'ignore' });
        const output = await new Response(child.stdout).text();
        await child.exited;
        const entries: ProcessEntry[] = [];
        for (const line of output.split('\n')) {
            if (line.startsWith('p')) entries.push({ pid: Number(line.slice(1)), name: '', exe: '' });
            if (line.startsWith('c') && entries.length > 0) entries[entries.length - 1].name = line.slice(1);
        }
        return entries;
    }

    public async isRunning(names: readonly string[]): Promise<boolean> {
        for (const name of names) {
            const child = Bun.spawn(['pgrep', '-x', name], { stdout: 'ignore', stderr: 'ignore' });
            if (await child.exited === 0) return true;
        }
        return false;
    }

    public terminate(pid: number): void {
        process.kill(pid, 'SIGTERM');
    }
}

export class SystemProcesses {
    public static readonly table: ProcessTable = process.platform === 'win32' ? new WindowsProcessTable() : new PosixProcessTable();
}
