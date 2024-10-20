import type { Registry } from '@omujs/omu/extension/registry/index.js';
import { type Writable } from 'svelte/store';

export function makeRegistryWritable<T>(registry: Registry<T>): Writable<T> {
    let ready = false;
    registry.listen(() => {
        ready = true;
    });
    return {
        set: (value: T) => {
            if (!ready) {
                throw new Error(`Registry ${registry.type.id.key()} is not ready`);
            }
            registry.set(value);
        },
        subscribe: (run) => {
            const unlisten = registry.listen(run);
            run(registry.value);
            return unlisten;
        },
        update: (fn) => {
            if (!ready) {
                throw new Error('Registry is not ready');
            }
            registry.update(fn);
        },
    };
}
