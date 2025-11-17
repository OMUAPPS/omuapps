import { writable } from 'svelte/store';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
const DEFAULT_CONFIG = {
    PACKAGE_MANAGER: 'npm' as PackageManager,
};

export const config = writable<typeof DEFAULT_CONFIG>(DEFAULT_CONFIG);

export const CONSTANTS = {
    'DOCS_ROOT': '/docs',
};

export function replaceConstants(content: string, config: typeof DEFAULT_CONFIG) {
    // %docs-root% -> /create
    const constants: Record<string, string> = {
        ...CONSTANTS,
        ...config,
    };
    return content.replace(/%([^%]+)%/g, (match, key) => {
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
