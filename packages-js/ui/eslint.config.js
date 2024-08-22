import config from '@omujs/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
    ...config.svelte,
    {
        ignores: ['storybook-static/', 'dist/',]
    }
];
