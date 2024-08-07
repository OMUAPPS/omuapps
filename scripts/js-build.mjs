import { execa, execaSync } from 'execa';

await Promise.all([
    execa('bun', ['--filter', '@omujs/ui', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
    execa('bun', ['--filter', '@omujs/i18n', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
    execa('bun', ['--filter', '@omujs/omu', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
]);
await Promise.all([
    execa('bun', ['--filter', '@omujs/chat', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
    execa('bun', ['--filter', '@omujs/obs', 'build'], {
        stderr: process.stderr,
        stdout: process.stdout,
    }),
]);

if (process.argv.includes('--build')) {
    const targets = process.argv[process.argv.indexOf('--build') + 1];
    targets.split(',').forEach((target) => {
        execaSync('bun', ['--filter', target, 'build'], {
            stderr: process.stderr,
            stdout: process.stdout,
        });
    });
}
