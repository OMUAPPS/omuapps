import globals from 'globals';
// import tseslint from 'typescript-eslint';

import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import ts from 'typescript-eslint';

import type { ConfigArray } from 'typescript-eslint';

export default [
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.base,
    {
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: ts.parser,
                svelteFeatures: {
                    /* -- Experimental Svelte Features -- */
                    /* It may be changed or removed in minor versions without notice. */
                    // Whether to parse the `generics` attribute.
                    // See https://github.com/sveltejs/rfcs/pull/38
                    experimentalGenerics: true,
                },
            },
        },
        files: ['**/*.svelte'],
    },
    {
        ignores: [
            '**/dist/',
            '**/node_modules/',
            '**/storybook-static/',
            '**/.svelte-kit/',
            '**/*.{js,cjs,mjs}',
            '**/src-tauri/',
            '.venv/',
            'appdata/',
        ],
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                YT: 'readonly',
                SpeechRecognition: 'readonly',
            },
        }
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            'svelte/indent': [
                'error',
                {
                    'indent': 4,
                    'ignoredNodes': [],
                    'switchCase': 0,
                    'alignAttributesVertically': false
                }
            ],
            'quotes': ['error', 'single'],
        }
    },
] satisfies ConfigArray;
