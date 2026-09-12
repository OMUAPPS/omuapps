import { dlopen } from 'bun:ffi';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

export const workspace: string = realpathSync(resolve(import.meta.dir, '..'));

if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('The debug task launcher currently requires Windows x64 and Bun.');
}

// HANDLE is an integer, not a bun:ffi pointer. Keep the DLL loaded until exit.
const kernel = dlopen('kernel32.dll', {
    CreateJobObjectW: { args: ['ptr', 'buffer'], returns: 'u64' },
    OpenJobObjectW: { args: ['u32', 'i32', 'buffer'], returns: 'u64' },
    SetInformationJobObject: { args: ['u64', 'i32', 'buffer', 'u32'], returns: 'i32' },
    AssignProcessToJobObject: { args: ['u64', 'i64'], returns: 'i32' },
    TerminateJobObject: { args: ['u64', 'u32'], returns: 'i32' },
    OpenProcess: { args: ['u32', 'i32', 'u32'], returns: 'u64' },
    WaitForSingleObject: { args: ['u64', 'u32'], returns: 'u32' },
    CloseHandle: { args: ['u64'], returns: 'i32' },
    GetLastError: { args: [], returns: 'u32' },
}).symbols;

function jobName(name: string): Buffer {
    const id = createHash('sha256').update(workspace.toLowerCase()).digest('hex').slice(0, 24);
    return Buffer.from(`Local\\omuapps-dev-${id}-${name}\0`, 'utf16le');
}

function check(result: number | bigint, operation: string): void {
    if (!result) throw new Error(`${operation} failed (Win32 ${kernel.GetLastError()})`);
}

export function ownProcessTree(name: string): void {
    const job = kernel.CreateJobObjectW(null, jobName(name));
    const error = kernel.GetLastError();
    check(job, 'CreateJobObjectW');
    if (error === 183) {
        kernel.CloseHandle(job);
        throw new Error(`Dev task ${name} is already running. Stop it before starting another instance.`);
    }
    try {
        // Windows x64 JOBOBJECT_EXTENDED_LIMIT_INFORMATION: sizeof=144,
        // BasicLimitInformation.LimitFlags at offset 16. No breakaway allowed.
        const limits = Buffer.alloc(144);
        limits.writeUInt32LE(0x2000, 16); // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        check(kernel.SetInformationJobObject(job, 9, limits, limits.length), 'SetInformationJobObject');
        // Assign ourselves BEFORE spawning: descendants inherit the job without a race.
        check(kernel.AssignProcessToJobObject(job, -1n), 'AssignProcessToJobObject');
    } catch (error) {
        kernel.CloseHandle(job);
        throw error;
    }
    // The non-inheritable handle lives only here. Windows closes it on forced
    // termination/crash too, killing descendants without relying on JS cleanup.
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
        process.on(signal, () => process.exit(0));
    }
    // Hold handles so a recycled PID cannot be mistaken for VS Code/the task host.
    for (const pid of new Set([process.ppid, Number(process.env.VSCODE_PID)].filter(pid => pid > 0))) {
        const parent = kernel.OpenProcess(0x00100000, 0, pid); // SYNCHRONIZE
        check(parent, `OpenProcess(${pid})`);
        setInterval(() => {
            const status = kernel.WaitForSingleObject(parent, 0);
            if (status === 0) process.exit(0);
            if (status !== 258) process.exit(1); // WAIT_TIMEOUT
        }, 500).unref();
    }
}

export function stopProcessTree(name: string): void {
    const job = kernel.OpenJobObjectW(0x0008, 0, jobName(name)); // JOB_OBJECT_TERMINATE
    if (!job) {
        if (kernel.GetLastError() === 2) return;
        check(job, 'OpenJobObjectW');
    }
    try {
        check(kernel.TerminateJobObject(job, 0), 'TerminateJobObject');
    } finally {
        kernel.CloseHandle(job);
    }
}

export function spawn(command: string[]): Bun.Subprocess<'ignore', 'inherit', 'inherit'> {
    return Bun.spawn(command, { cwd: workspace, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' });
}

export async function run(command: string[]): Promise<void> {
    const code = await spawn(command).exited;
    if (code !== 0) throw new Error(`${command.join(' ')} exited with code ${code}`);
}

export async function waitForPort(port: number): Promise<void> {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
        try {
            const socket = await Bun.connect({ hostname: '127.0.0.1', port, socket: { data() {}, error() {} } });
            socket.end();
            return;
        } catch {
            await Bun.sleep(200);
        }
    }
    throw new Error(`Timed out waiting for localhost:${port}`);
}

export function requireFreePort(port: number): void {
    // Never kill an arbitrary process just because it occupies a development port.
    const listener = Bun.listen({ hostname: '0.0.0.0', port, socket: { data() {} } });
    listener.stop(true);
}
