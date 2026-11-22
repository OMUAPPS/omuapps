import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ownProcessTree, run, workspace } from './dev-process';

ownProcessTree('prelaunch');
await run([process.execPath, 'scripts/js-generate-version.ts']);
await mkdir(join(workspace, 'appdata'), { recursive: true });
await Bun.write(join(workspace, 'appdata/token.txt'), randomBytes(16).toString('hex'));
