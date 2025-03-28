import { $ } from 'bun';

await $`bun run build`

Promise.all([
    $`bun run --cwd packages-js/dash ui:dev`,
    $`bun run --cwd packages-js/dash dev`,
    $`bun run --cwd packages-js/site dev`,
    $`bun run --cwd packages-js/dash ui:check-watch`,
    $`bun run --cwd packages-js/site check:watch`,
    $`bun run --cwd packages-js/ui watch`,
    $`bun run --cwd packages-js/i18n watch`,
    $`bun run --cwd packages-js/omu watch`,
    $`bun run --cwd packages-js/chat watch`,
    $`bun run --cwd packages-js/plugin-obs watch`,
])
