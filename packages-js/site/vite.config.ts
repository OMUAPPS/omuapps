import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs/promises';
import { searchForWorkspaceRoot, type PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const reloadPlugin = (): PluginOption => ({
    name: 'reload',
    configureServer(server) {
        const path = searchForWorkspaceRoot(process.cwd() + '..') + '/documentation';
        (async () => {
            const watcher = fs.watch(path, { recursive: true });
            for await (const event of watcher) {
                if (event.eventType !== 'change') continue;
                server.watcher.emit('change', event.filename);
                console.log('[doc]', event.filename);
            }
        })();
        server.watcher.on('change', (file) => {
            if (!file.endsWith('.md')) return;
            server.ws.send({ type: 'full-reload' });
        });
    },
});

export default defineConfig({
    plugins: [sveltekit(), reloadPlugin()],
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
