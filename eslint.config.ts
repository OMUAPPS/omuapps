import globals from 'globals';

import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import ts from 'typescript-eslint';

import type { ConfigArray } from 'typescript-eslint';

export default [
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    {
        plugins: {
            '@stylistic': stylistic,
        },
    },
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
                Twitch: 'readonly',
                webkitSpeechRecognition: 'readonly',
                SpeechRecognition: 'readonly',
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            'quotes': ['error', 'single'],

            'svelte/html-closing-bracket-spacing': 'error',
            'svelte/indent': [
                'error',
                {
                    'indent': 4,
                    'ignoredNodes': [],
                    'switchCase': 1,
                    'alignAttributesVertically': false,
                },
            ],
            'svelte/no-navigation-without-resolve': 'off',

            //#region stylistic
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/arrow-spacing': ['error', {
                'before': true,
                'after': true,
            }],
            '@stylistic/brace-style': ['error', '1tbs', {
                'allowSingleLine': true,
            }],
            '@stylistic/comma-dangle': ['warn', 'always-multiline'],
            '@stylistic/comma-spacing': ['error', { 'before': false, 'after': true }],
            '@stylistic/eol-last': ['error', 'always'],
            '@stylistic/key-spacing': ['error', {
                'beforeColon': false,
                'afterColon': true,
            }],
            '@stylistic/keyword-spacing': ['error', {
                'before': true,
                'after': true,
            }],
            '@stylistic/indent': ['error', 4],
            '@stylistic/lines-between-class-members': 'off',
            '@stylistic/no-multi-spaces': ['error'],
            '@stylistic/no-multiple-empty-lines': ['error', { 'max': 1 }],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/padded-blocks': ['error', 'never'],
            '@stylistic/nonblock-statement-body-position': ['error', 'beside'],
            '@stylistic/padding-line-between-statements': [
                'error',
                { 'blankLine': 'always', 'prev': 'function', 'next': '*' },
                { 'blankLine': 'always', 'prev': '*', 'next': 'function' },
            ],
            '@stylistic/quotes': ['warn', 'single'],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/semi-spacing': ['error', { 'before': false, 'after': true }],
            '@stylistic/space-before-blocks': ['error', 'always'],
            '@stylistic/space-before-function-paren': ['error', {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always',
                'catch': 'always',
            }],
            '@stylistic/space-infix-ops': ['error'],
            '@stylistic/type-annotation-spacing': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/member-delimiter-style': 'error',
            '@stylistic/space-in-parens': ['error', 'never'],
        },
    },
] as ConfigArray;
