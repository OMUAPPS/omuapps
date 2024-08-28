import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import ts from 'typescript-eslint';



/** @type {Record<string, import('eslint').Linter.Config[]>} */
export default {
    typescript: [
        js.configs.recommended,
        ...ts.configs.recommended,
        {
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.node,
                },
            },
        },
        {
            ignores: ['dist/']
        },
        {
            rules: {
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-unused-vars': 'warn',
                "indent": ["error", 4],
                "quotes": ["error", "single"],
            },
        },
    ],
    svelte: [
        js.configs.recommended,
        ...ts.configs.recommended,
        ...svelte.configs['flat/recommended'],
        {
            files: ["**/*.svelte", "*.svelte"],
            languageOptions: {
                parser: svelteParser,
                parserOptions: {
                    svelteFeatures: {
                        /* -- Experimental Svelte Features -- */
                        /* It may be changed or removed in minor versions without notice. */
                        // Whether to parse the `generics` attribute.
                        // See https://github.com/sveltejs/rfcs/pull/38
                        experimentalGenerics: true,
                    },
                },
            },
        },
        {
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.node,
                },
            }
        },
        {
            files: ['**/*.svelte'],
            languageOptions: {
                parserOptions: {
                    parser: ts.parser
                }
            }
        },
        {
            rules: {
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-unused-vars': 'warn',
                "indent": ["error", 4],
                "quotes": ["error", "single"],
                "svelte/indent": [
                    "error",
                    {
                        "indent": 4,
                        "ignoredNodes": [],
                        "switchCase": 1,
                        "alignAttributesVertically": false
                    }
                ],
            }
        },
        {
            ignores: ['build/', '.svelte-kit/']
        },
    ],
};
