import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
