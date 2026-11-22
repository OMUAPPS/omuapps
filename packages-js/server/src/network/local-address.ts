import { networkInterfaces } from 'node:os';

export class LocalAddress {
    private static readonly LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

    public static lan(): string {
        for (const addresses of Object.values(networkInterfaces())) {
            for (const address of addresses ?? []) {
                if (address.family !== 'IPv4' || address.internal) continue;
                return address.address;
            }
        }
        return '127.0.0.1';
    }

    public static normalize(address: string): string {
        if (address.startsWith('::ffff:')) return address.slice('::ffff:'.length);
        return address;
    }

    public static isLoopback(address: string): boolean {
        return LocalAddress.LOOPBACK.has(LocalAddress.normalize(address));
    }

    public static isLocal(address: string): boolean {
        return LocalAddress.isLoopback(address) || LocalAddress.normalize(address) === LocalAddress.lan();
    }
}
