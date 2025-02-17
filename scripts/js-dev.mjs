import { execa } from 'execa';
import './js-build.mjs';

const option = { stderr: process.stderr, stdout: process.stdout }

execa('pnpm', ['--filter', 'dash', 'ui:dev'], option);
execa('pnpm', ['--filter', 'dash', 'dev'], option);
execa('pnpm', ['--filter', 'site', 'dev'], option);
execa('pnpm', ['--filter', 'dash', 'ui:check-watch'], option);
execa('pnpm', ['--filter', 'site', 'check:watch'], option);
execa('pnpm', ['--filter', 'ui', 'watch'], option);
execa('pnpm', ['--filter', 'i18n', 'watch'], option);
execa('pnpm', ['--filter', 'omu', 'watch'], option);
execa('pnpm', ['--filter', 'chat', 'watch'], option);
execa('pnpm', ['--filter', 'obs', 'watch'], option);
