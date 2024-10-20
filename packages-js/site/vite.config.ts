import { sveltekit } from '@sveltejs/kit/vite';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
    },
    server: {
        port: 5173,
        strictPort: true,
        fs: {
            allow: [searchForWorkspaceRoot(process.cwd() + '..')],
        },
    },
});
