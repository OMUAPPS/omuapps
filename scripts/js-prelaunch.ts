import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ownProcessTree, run, workspace } from './dev-process';

ownProcessTree('prelaunch');
for await (const directory of new Bun.Glob('packages-py/**/__pycache__').scan({ cwd: workspace, onlyFiles: false })) {
    await rm(join(workspace, directory), { recursive: true, force: true });
}
// Keep release/development version generation in the existing shared tool.
await run(['uv', 'run', 'scripts/py-generate_version.py']);
await mkdir(join(workspace, 'appdata'), { recursive: true });
await Bun.write(join(workspace, 'appdata/token.txt'), randomBytes(16).toString('hex'));
