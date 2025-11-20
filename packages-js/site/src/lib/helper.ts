import { Identifier, type IntoId } from '@omujs/omu';
import { BROWSER } from 'esm-env';
import { writable, type Writable } from 'svelte/store';

/**
 * DO NOT USE THIS FUNCTION FOR SECURITY
 */
export function sha256(data: Uint8Array): Uint8Array {
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    const k = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);

    const originalBitLength = data.length * 8;
    const originalByteLength = data.length;

    let paddedLength = originalByteLength + 9;
    while (paddedLength % 64 !== 0) {
        paddedLength++;
    }

    const padded = new Uint8Array(paddedLength);
    padded.set(data);
    padded[originalByteLength] = 0x80;

    const lengthView = new DataView(padded.buffer, paddedLength - 8);

    const lengthBig = BigInt(originalBitLength);
    lengthView.setUint32(0, Number((lengthBig >> 32n) & 0xffffffffn), false);
    lengthView.setUint32(4, Number(lengthBig & 0xffffffffn), false);

    for (let chunkStart = 0; chunkStart < paddedLength; chunkStart += 64) {
        const chunk = new Uint8Array(padded.buffer, chunkStart, 64);
        const w = new Uint32Array(64);

        for (let i = 0; i < 16; i++) {
            w[i] = (chunk[i * 4] << 24) |
                   (chunk[i * 4 + 1] << 16) |
                   (chunk[i * 4 + 2] << 8) |
                   (chunk[i * 4 + 3]);
        }

        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

        for (let i = 0; i < 64; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (h + S1 + ch + k[i] + w[i]) >>> 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
        h5 = (h5 + f) >>> 0;
        h6 = (h6 + g) >>> 0;
        h7 = (h7 + h) >>> 0;
    }

    const hash = new Uint8Array(32);
    const hashView = new DataView(hash.buffer);
    hashView.setUint32(0, h0, false);
    hashView.setUint32(4, h1, false);
    hashView.setUint32(8, h2, false);
    hashView.setUint32(12, h3, false);
    hashView.setUint32(16, h4, false);
    hashView.setUint32(20, h5, false);
    hashView.setUint32(24, h6, false);
    hashView.setUint32(28, h7, false);

    return hash;
}

function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
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

export function downloadFile(options: { filename: string; content: Uint8Array; type: string }) {
    const { filename, content, type } = options;
    const blob = new Blob([content as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export class Interval implements Writable<number> {
    private value: number;
    private listeners: Set<(value: number) => void>;
    private timer: ReturnType<typeof setInterval> | null;

    constructor(private interval: number) {
        this.value = 0;
        this.listeners = new Set();
        this.timer = null;
    }

    start(): Interval {
        if (this.timer) return this;
        this.timer = setInterval(() => {
            this.value++;
            this.listeners.forEach((run) => run(this.value));
        }, this.interval);
        return this;
    }

    stop(): Interval {
        if (!this.timer) return this;
        clearInterval(this.timer);
        this.timer = null;
        return this;
    }

    set(value: number) {
        this.value = value;
        this.listeners.forEach((run) => run(this.value));
    }

    subscribe(run: (value: number) => void): () => void {
        this.listeners.add(run);
        run(this.value);
        return () => {
            this.listeners.delete(run);
        };
    }

    update(fn: (value: number) => number) {
        this.value = fn(this.value);
        this.listeners.forEach((run) => run(this.value));
    }
}

type Comparator<T> = (a: T, b: T) => number;

export function comparator<T>(func: (value: T) => number): Comparator<T> {
    return (a, b) => {
        return func(a) - func(b);
    };
}

export function getSetting<T>(id: IntoId, defaultValue: T): Writable<T> {
    if (!BROWSER) return writable(defaultValue);
    const key = `setting:${Identifier.from(id).key()}`;
    const stored = localStorage.getItem(key);
    let value: T = stored ? JSON.parse(stored) as T : defaultValue;
    const listeners = new Set<(value: T) => void>();
    return {
        set: (newValue: T) => {
            value = newValue;
            localStorage.setItem(key, JSON.stringify(value));
            listeners.forEach((run) => run(value));
        },
        subscribe: (run) => {
            listeners.add(run);
            run(value);
            return () => {
                listeners.delete(run);
            };
        },
        update: (fn) => {
            value = fn(value);
            localStorage.setItem(key, JSON.stringify(value));
            listeners.forEach((run) => run(value));
        },
    };
}

export function isElementContains(element: HTMLElement, target: EventTarget | null) {
    if (!target) return;
    if (!(target instanceof HTMLElement)) return;
    let parent: HTMLElement | null = target;
    while (parent) {
        if (parent === element) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
