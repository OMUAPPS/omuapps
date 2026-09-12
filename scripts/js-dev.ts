import { parseArgs } from 'node:util';
import { ownProcessTree, requireFreePort, run, spawn, stopProcessTree, waitForPort } from './dev-process';

const { values } = parseArgs({ options: {
    apps: { type: 'boolean' },
    dash: { type: 'boolean' },
    stop: { type: 'boolean' },
} });

if (values.stop) {
    for (const name of ['dash', 'apps', 'index', 'prelaunch']) stopProcessTree(name);
    process.exit(0);
}
if (Number(!!values.apps) + Number(!!values.dash) !== 1) {
    throw new Error('Use --apps or --dash (--dash requires the dev-apps task).');
}

ownProcessTree(values.apps ? 'apps' : 'dash');
console.log('Dev starting');

if (values.apps) {
    for (const port of [5173, 26420]) requireFreePort(port);
    await run([process.execPath, 'run', 'build']);
}

const commands = values.apps
    ? [
        ['dash', 'ui:dev'],
        ['site', 'dev'],
        ['dash', 'ui:check-watch'],
        ['site', 'check:watch'],
        ...['ui', 'i18n', 'omu', 'chat', 'plugin-obs'].map(pkg => [pkg, 'watch']),
    ]
    : [['dash', 'dev']];

const children = commands.map(([pkg, script, ...args]) => spawn([
    process.execPath, 'run', '--cwd', `packages-js/${pkg}`, script, ...args,
]));
// A watcher exiting ends the task and its siblings instead of silently respawning.
for (const child of children) {
    void child.exited.then((code) => {
        console.error(`Dev process ${child.pid} exited (${code}); stopping the task.`);
        process.exit(code || 1);
    });
}

await Promise.all([5173, 26420].map(waitForPort));
console.log('Dev ready');
await Promise.race(children.map(child => child.exited));
