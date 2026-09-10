import { mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { ownProcessTree, requireFreePort, run, spawn, waitForPort, workspace } from './dev-process';

ownProcessTree('index');
console.log('Index starting');
requireFreePort(26410);
const packages = join(workspace, '.venv', 'packages');
await mkdir(packages, { recursive: true });
const server = spawn(['uv', 'run', 'pypi-server', 'run', '-i', '127.0.0.1', '-p', '26410', '--verbose', packages]);
void server.exited.then(code => process.exit(code || 1));
await waitForPort(26410);
console.log('Index ready');
console.log('Type \'build [package ...]\' to build packages; \'quit\' to stop the index.');

const input = createInterface({ input: process.stdin });
try {
    for await (const line of input) {
        const [command, ...args] = line.trim().split(/\s+/);
        if (['exit', 'quit', 'q'].includes(command)) break;
        if (['build', 'b'].includes(command)) {
            for (const file of await readdir(packages, { withFileTypes: true })) {
                if (file.isFile()) await unlink(join(packages, file.name));
            }
            try {
                await run(['uv', 'build', '--out-dir', packages,
                    ...(args.length ? args.flatMap(pkg => ['--package', pkg]) : ['--all-packages'])]);
            } catch (error) {
                console.error(error);
            }
        } else if (command) {
            console.log(`Unknown command: ${command}`);
        }
    }
} finally {
    input.close();
    // EOF and quit close the entire job, including uv's Python child.
    process.exit(0);
}
