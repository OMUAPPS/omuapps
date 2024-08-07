import { execa } from 'execa';
import './js-build.mjs';

execa('bun', ['--filter', 'dash', 'dev'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', 'site', 'dev'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', 'dash', 'ui:check-watch'], {
    stderr: process.stderr,
    stdout: process.stdout,
});
execa('bun', ['--filter', 'site', 'check:watch'], {
    stderr: process.stderr,
    stdout: process.stdout,
});
execa('bun', ['--filter', '@omujs/ui', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', '@omujs/i18n', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', '@omujs/omu', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', '@omujs/chat', 'watch'], { stderr: process.stderr, stdout: process.stdout });
execa('bun', ['--filter', '@omujs/obs', 'watch'], { stderr: process.stderr, stdout: process.stdout });
