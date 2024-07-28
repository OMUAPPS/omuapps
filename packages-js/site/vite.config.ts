import { sveltekit } from '@sveltejs/kit/vite';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit()],
    ssr: {
        external: ['reflect-metadata'],
    },
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
    },
    server: {
        fs: {
            allow: [searchForWorkspaceRoot(process.cwd() + '..')],
        },
    },
});
