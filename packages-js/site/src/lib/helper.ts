import type { Registry } from '@omujs/omu/extension/registry/index.js';
import { type Writable } from 'svelte/store';

export function makeRegistryWritable<T>(registry: Registry<T>): Writable<T> & {
    wait: () => Promise<void>;
}{
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
        wait: () => {
            return new Promise<void>((resolve) => {
                if (ready) {
                    resolve();
                } else {
                    listeners.add(() => {
                        resolve();
                    });
                }
            });
        },
    };
}

export function md5(data: Uint8Array): Uint8Array {
    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    const K = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
        0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
        0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
        0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
        0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
        0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ];

    const s = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];

    const bitLen = data.length * 8;

    // Calculate padding
    const padLength = (data.length + 8 + 64) & ~63;
    const padded = new Uint8Array(padLength);
    padded.set(data);
    padded[data.length] = 0x80;

    // Append length in bits (little-endian)
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLen, true);
    view.setUint32(padded.length - 4, 0, true);

    // Process each 64-byte block
    for (let i = 0; i < padded.length; i += 64) {
        const block = padded.subarray(i, i + 64);
        const M = new Uint32Array(16);
        const blockView = new DataView(block.buffer);
        for (let j = 0; j < 16; j++) {
            M[j] = blockView.getUint32(j * 4, true);
        }

        let A = a0, B = b0, C = c0, D = d0;

        for (let step = 0; step < 64; step++) {
            let F, g;
            if (step < 16) {
                F = (B & C) | (~B & D);
                g = step;
            } else if (step < 32) {
                F = (D & B) | (~D & C);
                g = (5 * step + 1) % 16;
            } else if (step < 48) {
                F = B ^ C ^ D;
                g = (3 * step + 5) % 16;
            } else {
                F = C ^ (B | ~D);
                g = (7 * step) % 16;
            }

            F = (F + A + K[step] + M[g]) >>> 0;
            const rotated = ((F << s[step]) | (F >>> (32 - s[step]))) >>> 0;
            [A, B, C, D] = [D, (B + rotated) >>> 0, B, C];
        }

        a0 = (a0 + A) >>> 0;
        b0 = (b0 + B) >>> 0;
        c0 = (c0 + C) >>> 0;
        d0 = (d0 + D) >>> 0;
    }

    // Convert to little-endian byte array
    const result = new Uint8Array(16);
    const resView = new DataView(result.buffer);
    resView.setUint32(0, a0, true);
    resView.setUint32(4, b0, true);
    resView.setUint32(8, c0, true);
    resView.setUint32(12, d0, true);

    // Convert to hex string
    return result
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function once(fn: (resolve: () => void) => (PromiseLike<() => unknown>) | (() => unknown)): Promise<void> {
    return new Promise((_resolve) => {
        const promise = fn(async () => {
            _resolve();
        });
        (async () => {
            const unlisten = await promise;
            unlisten();
        })().catch((e) => {
            console.error('Error in once:', e);
        });
    });
}

export function downloadFile(options: {filename: string, content: Uint8Array, type: string}) {
    const { filename, content, type } = options;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
