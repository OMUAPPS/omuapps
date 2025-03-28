import { $ } from 'bun';

const paths = [
    'packages-js/chat',
    'packages-js/dash',
    'packages-js/i18n',
    'packages-js/omu',
    'packages-js/plugin-obs',
    'packages-js/site',
    'packages-js/ui'
]

for await (const path of paths) {
    console.log(`\n=== ${path} ===`)
    await $`bun depcheck ${path}`
}
