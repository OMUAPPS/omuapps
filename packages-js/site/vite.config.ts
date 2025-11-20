import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit() as never],
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
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        allowedHosts: true,
    },
    build: {
        rollupOptions: {
            external: '@2ji-han/kuromoji.js',
        },
    },
});
