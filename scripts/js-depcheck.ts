import { execa } from 'execa'

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
    await execa('pnpm depcheck', [`${path}`], { stderr: process.stderr, stdout: process.stdout })
        .catch(() => { })
}
