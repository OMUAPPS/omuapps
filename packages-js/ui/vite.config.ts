import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit()],
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern',
            },
        },
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
    },
});
