import { writable } from 'svelte/store';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

type Config = {
    PACKAGE_MANAGER: PackageManager;
};

const DEFAULT_CONFIG: Config = {
    PACKAGE_MANAGER: 'npm',
};

const PACKAGE_MANAGER_COMMANDS = {
    npm: {
        runner: 'npx',
        install: 'npm install',
        add: 'npm install',
        addDev: 'npm install --save-dev',
        run: 'npm run',
    },
    pnpm: {
        runner: 'pnpm dlx',
        install: 'pnpm install',
        add: 'pnpm add',
        addDev: 'pnpm add --save-dev',
        run: 'pnpm',
    },
    yarn: {
        runner: 'yarn dlx',
        install: 'yarn install',
        add: 'yarn add',
        addDev: 'yarn add --dev',
        run: 'yarn',
    },
    bun: {
        runner: 'bunx',
        install: 'bun install',
        add: 'bun add',
        addDev: 'bun add --dev',
        run: 'bun run',
    },
} as const satisfies Record<
    PackageManager,
    {
        runner: string;
        install: string;
        add: string;
        addDev: string;
        run: string;
    }
>;

export const config = writable<Config>(DEFAULT_CONFIG);

export const CONSTANTS = {
    DOCS_ROOT: '/docs',
} as const;

export function replaceConstants(content: string, config: Config) {
    const packageCommands = PACKAGE_MANAGER_COMMANDS[config.PACKAGE_MANAGER];

    const constants: Record<string, string> = {
        ...CONSTANTS,
        ...config,

        PACKAGE_RUNNER: packageCommands.runner,
        PACKAGE_INSTALL: packageCommands.install,
        PACKAGE_ADD: packageCommands.add,
        PACKAGE_ADD_DEV: packageCommands.addDev,
        PACKAGE_RUN: packageCommands.run,
    };

    return content.replace(/%([^%]+)%/g, (_, key: string) => {
        const value = constants[key];

        if (value === undefined) {
            throw new Error(`Unknown constant: ${key}`);
        }

        return value;
    });
}

export const GROUP_NAMES: Record<string, string | undefined> = {
    index: '',
    guide: '導入方法',
    app: 'アプリ',
    api: 'API',
};
