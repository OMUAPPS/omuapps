import config from '@omujs/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
    ...config.svelte,
    {
        languageOptions: {
            globals: {
                'YT': 'readonly',
                'SpeechRecognition': 'readonly',
                'webkitSpeechRecognition': 'readonly',
            }
        }
    }
];
