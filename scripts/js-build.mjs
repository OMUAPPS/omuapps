import { execa } from 'execa';

const option = { stderr: process.stderr, stdout: process.stdout }

await Promise.all([
    execa('pnpm', ['--filter', 'ui', 'build'], option),
    execa('pnpm', ['--filter', 'i18n', 'build'], option),
    execa('pnpm', ['--filter', 'omu', 'build'], option),
]);

await execa('pnpm', ['--filter', 'chat', 'build'], option);

await Promise.all([
    execa('pnpm', ['--filter', 'obs', 'build'], option),
]);

if (process.argv.includes('--build')) {
    const targets = process.argv[process.argv.indexOf('--build') + 1];
    targets.split(',').forEach((target) => {
        execaSync('pnpm', ['--filter', target, 'build'], option);
    });
}
