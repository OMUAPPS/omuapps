import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'fs/promises';
import { searchForWorkspaceRoot, type PluginOption } from 'vite';
import { defineConfig } from 'vitest/config';

const changedFiles = new Map<string, number>();

const reloadPlugin = (): PluginOption => ({
    name: 'reload',
    configureServer(server) {
        const path = searchForWorkspaceRoot(process.cwd() + '..') + '/documentation';
        (async () => {
            const watcher = fs.watch(path, { recursive: true });
            for await (const event of watcher) {
                if (!event.filename || event.eventType !== 'change') continue;
                const last = changedFiles.get(event.filename);
                const elapsed = Date.now() - (last || 0);
                if (last && elapsed < 100) continue;
                changedFiles.set(event.filename, Date.now());
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
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        fs: {
            allow: [searchForWorkspaceRoot(process.cwd() + '..')],
        },
        allowedHosts: true,
    },
});
