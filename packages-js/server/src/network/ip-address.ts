import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

export class IpAddress {
    private static readonly NON_GLOBAL = IpAddress.createNonGlobal();

    public static async resolve(host: string): Promise<string> {
        const hostname = host.replace(/^\[|\]$/g, '');
        if (isIP(hostname)) return hostname;
        const { address } = await lookup(hostname);
        return address;
    }

    public static isGlobal(address: string): boolean {
        const family = isIP(address) === 6 ? 'ipv6' : 'ipv4';
        return !IpAddress.NON_GLOBAL.check(address, family);
    }

    public static isPrivate(address: string): boolean {
        return !IpAddress.isGlobal(address);
    }

    private static createNonGlobal(): BlockList {
        const list = new BlockList();
        list.addSubnet('0.0.0.0', 8, 'ipv4');
        list.addSubnet('10.0.0.0', 8, 'ipv4');
        list.addSubnet('100.64.0.0', 10, 'ipv4');
        list.addSubnet('127.0.0.0', 8, 'ipv4');
        list.addSubnet('169.254.0.0', 16, 'ipv4');
        list.addSubnet('172.16.0.0', 12, 'ipv4');
        list.addSubnet('192.0.0.0', 24, 'ipv4');
        list.addSubnet('192.168.0.0', 16, 'ipv4');
        list.addSubnet('198.18.0.0', 15, 'ipv4');
        list.addSubnet('224.0.0.0', 3, 'ipv4');
        list.addAddress('::', 'ipv6');
        list.addAddress('::1', 'ipv6');
        list.addSubnet('fc00::', 7, 'ipv6');
        list.addSubnet('fe80::', 10, 'ipv6');
        list.addSubnet('ff00::', 8, 'ipv6');
        return list;
    }
}
