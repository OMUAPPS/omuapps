import { afterAll, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ownProcessTree, stopProcessTree } from './dev-process';

// Each test uses its own named job; never touches real dev tasks or occupied ports.
const directory = await mkdtemp(join(tmpdir(), 'omuapps-dev-test-'));
const fixture = join(directory, 'tree.ts');
const helper = new URL('./dev-process.ts', import.meta.url).href;
await writeFile(fixture, `
import { ownProcessTree } from ${JSON.stringify(helper)};
const [role, name] = process.argv.slice(2);
if (role === 'root') ownProcessTree(name);
if (role === 'leaf') {
    console.log(JSON.stringify([process.pid]));
} else {
    const next = role === 'host' ? 'root' : role === 'root' ? 'child' : 'leaf';
    const child = Bun.spawn([process.execPath, import.meta.path, next, name], {
        stdin: 'pipe', stdout: 'pipe', stderr: 'inherit',
    });
    const reader = child.stdout.getReader();
    const { value } = await reader.read();
    const pids = JSON.parse(new TextDecoder().decode(value));
    console.log(JSON.stringify([process.pid, ...pids]));
}
process.stdin.resume();
process.stdin.on('data', () => process.exit(0));
setInterval(() => {}, 1000);
`);

afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
});

function alive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function eventuallyGone(pids: number[]): Promise<void> {
    const deadline = Date.now() + 5000;
    while (pids.some(alive) && Date.now() < deadline) await Bun.sleep(25);
    expect(pids.filter(alive)).toEqual([]);
}

for (const mode of ['normal', 'forced', 'stop-task', 'parent-dies'] as const) {
    test(`process tree cleanup: ${mode}`, async () => {
        const name = `test-${crypto.randomUUID()}`;
        const root = Bun.spawn([process.execPath, fixture, mode === 'parent-dies' ? 'host' : 'root', name], {
            stdin: 'pipe', stdout: 'pipe', stderr: 'inherit',
        });
        try {
            const { value } = await root.stdout.getReader().read();
            const pids: number[] = JSON.parse(new TextDecoder().decode(value));
            expect(pids.length).toBe(mode === 'parent-dies' ? 4 : 3);
            expect(pids.every(alive)).toBe(true);
            if (mode === 'normal') {
                root.stdin.write('exit\n');
                root.stdin.flush();
            } else if (mode === 'stop-task') {
                stopProcessTree(name);
            } else {
                root.kill(9);
            }
            await eventuallyGone(pids);
            await root.exited;
            stopProcessTree(name); // Repeated stop is harmless.
        } finally {
            stopProcessTree(name);
            root.kill();
            await root.exited;
        }
    }, 10_000);
}

test('duplicate job does not terminate the existing tree', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const root = Bun.spawn([process.execPath, fixture, 'root', name], {
        stdin: 'pipe', stdout: 'pipe', stderr: 'inherit',
    });
    try {
        const { value } = await root.stdout.getReader().read();
        const pids: number[] = JSON.parse(new TextDecoder().decode(value));
        expect(() => ownProcessTree(name)).toThrow('already running');
        expect(pids.every(alive)).toBe(true);
        stopProcessTree(name);
        await eventuallyGone(pids);
    } finally {
        stopProcessTree(name);
        root.kill();
        await root.exited;
    }
});
