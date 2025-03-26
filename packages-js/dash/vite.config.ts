import { sveltekit } from '@sveltejs/kit/vite';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit()],
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler'
            }
        }
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
    },
    server: {
        port: 26420,
        strictPort: true,
        fs: {
            allow: [searchForWorkspaceRoot(process.cwd() + '..')],
        },
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
});
