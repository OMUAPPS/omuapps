import type { Registry } from '@omujs/omu/extension/registry/index.js';
import { type Writable } from 'svelte/store';

export function makeRegistryWritable<T>(registry: Registry<T>): Writable<T> {
    let ready = false;
    let value: T = registry.value;
    const listeners = new Set<(value: T) => void>();
    registry.listen((newValue) => {
        ready = true;
        value = newValue;
        listeners.forEach((run) => {
            run(value);
        });
    });
    return {
        set: (value: T) => {
            if (!ready) {
                throw new Error(`Registry ${registry.type.id.key()} is not ready`);
            }
            registry.set(value);
        },
        subscribe: (run) => {
            listeners.add(run);
            run(value);
            return () => {
                listeners.delete(run);
            };
        },
        update: (fn) => {
            if (!ready) {
                throw new Error(`Registry ${registry.type.id.key()} is not ready`);
            }
            registry.update(fn);
        },
    };
}
