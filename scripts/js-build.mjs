import { execa, execaSync } from 'execa';

await Promise.all([
    execa('pnpm', ['--filter', 'ui', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
    execa('pnpm', ['--filter', 'i18n', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
    execa('pnpm', ['--filter', 'omu', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
]);
execaSync('pnpm', ['--filter', 'chat', 'build'], {
    stderr: process.stderr,
    stdout: process.stdout,
});
await Promise.all([
    execa('pnpm', ['--filter', 'obs', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
]);

if (process.argv.includes('--build')) {
    const targets = process.argv[process.argv.indexOf('--build') + 1];
    targets.split(',').forEach((target) => {
        execaSync('pnpm', ['--filter', target, 'build'], {
            stderr: process.stderr,
            stdout: process.stdout,
        });
    });
}
