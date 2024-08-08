import { execa } from 'execa';
import './js-build.mjs';

execa('pnpm', ['--filter', 'dash', 'dev'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'site', 'dev'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'dash', 'ui:check-watch'], {
    stderr: process.stderr,
    stdout: process.stdout,
});
execa('pnpm', ['--filter', 'site', 'check:watch'], {
    stderr: process.stderr,
    stdout: process.stdout,
});
execa('pnpm', ['--filter', 'ui', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'i18n', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'omu', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'chat', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('pnpm', ['--filter', 'obs', 'watch'], { stderr: process.stderr, stdout: process.stdout });
