module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json']
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript'
    ],
    rules: {
        indent: ['warn', 4],
        'eol-last': ['error', 'always'],
        semi: ['error', 'always'],
        'semi-spacing': ['error', { before: false, after: true }],
        quotes: ['warn', 'single'],
        'comma-dangle': ['warn', 'always-multiline'],
        'keyword-spacing': [
            'error',
            {
                before: true,
                after: true
            }
        ],
        'key-spacing': [
            'error',
            {
                beforeColon: false,
                afterColon: true
            }
        ],
        'arrow-spacing': [
            'error',
            {
                before: true,
                after: true
            }
        ],
        'padded-blocks': ['error', 'never'],
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'no-multi-spaces': ['error'],
        'no-var': ['error'],
        'prefer-arrow-callback': ['error'],
        'no-throw-literal': ['warn'],
        'no-param-reassign': ['warn'],
        'no-constant-condition': ['warn'],
        'no-empty-pattern': ['warn'],
        'no-async-promise-executor': ['off'],
        'no-useless-escape': ['off'],
        'no-multiple-empty-lines': ['error', { max: 1 }],
        'no-control-regex': ['warn'],
        'no-empty': ['warn'],
        'no-inner-declarations': ['off'],
        'no-sparse-arrays': ['off'],
        'nonblock-statement-body-position': ['error', 'beside'],
        'object-curly-spacing': ['error', 'always'],
        'space-infix-ops': ['error'],
        'space-before-blocks': ['error', 'always'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-unnecessary-condition': ['warn'],
        '@typescript-eslint/no-var-requires': ['warn'],
        '@typescript-eslint/no-inferrable-types': ['warn'],
        '@typescript-eslint/no-empty-function': ['off'],
        '@typescript-eslint/no-non-null-assertion': ['off'],
        '@typescript-eslint/explicit-function-return-type': ['warn'],
        '@typescript-eslint/no-misused-promises': [
            'error',
            {
                checksVoidReturn: false
            }
        ],
        'import/no-unresolved': ['off'],
        'import/no-default-export': ['warn'],
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                pathGroups: [
                    {
                        pattern: 'react',
                        group: 'external',
                        position: 'before'
                    }
                ],
                pathGroupsExcludedImportTypes: ['react'],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true
                }
            }
        ],
        'import/no-cycle': [1, { maxDepth: 1 }],
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_'
            }
        ],
        "@typescript-eslint/consistent-type-imports": [
            "error",
            {
                "prefer": "type-imports",
                "disallowTypeAnnotations": false
            }
        ]
    }
};