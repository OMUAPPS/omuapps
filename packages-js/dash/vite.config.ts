import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit() as any],
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
    optimizeDeps: {
        noDiscovery: true,
    },
    server: {
        port: 26420,
        strictPort: true,
        watch: {
            ignored: [
                '**/src-tauri/**',
                '**/.svelte-kit/**',
            ],
        },
    },
});
