import { describe, expect, test } from 'bun:test';

import { App } from '../src/app';
import { RegistryExtension } from '../src/api/registry/extension';
import { RegistryType } from '../src/api/registry/registry';
import { SignalExtension } from '../src/api/signal/extension';
import { SignalType } from '../src/api/signal/signal';
import type { Identifier } from '../src/identifier';
import type { Omu } from '../src/omu';

type PacketHandler = (data: unknown) => void;

function createOmu(): Omu {
    const packetHandlers = new Map<string, PacketHandler[]>();
    const network = {
        registerPacket: () => {},
        addPacketHandler: (
            type: { id: Identifier },
            handler: PacketHandler,
        ) => {
            const key = type.id.key();
            const handlers = packetHandlers.get(key) ?? [];
            handlers.push(handler);
            packetHandlers.set(key, handlers);
        },
        addTask: () => {},
    };

    return {
        app: new App('com.example:test', {}),
        network,
        running: false,
        ready: false,
        send: async () => {},
        onReady: () => () => {},
        endpoints: {
            call: async () => {
                throw new Error('Unexpected endpoint call');
            },
        },
    } as unknown as Omu;
}

describe('SignalExtension', () => {
    test('creates an app-local identifier without duplicating the name', () => {
        const signals = new SignalExtension(createOmu());

        const signal = signals.json<string>('message');

        expect(signal.type.id.key()).toBe('com.example:test/message');
    });

    test('returns the same signal for the same type', () => {
        const signals = new SignalExtension(createOmu());
        const type = SignalType.createJson<string>('com.example:test', {
            name: 'message',
        });

        expect(signals.get(type)).toBe(signals.get(type));
    });

    test('rejects duplicate app-local signal names', () => {
        const signals = new SignalExtension(createOmu());
        signals.json<string>('message');

        expect(() => signals.json<string>('message')).toThrow(
            "Signal with identifier 'com.example:test/message' already exists",
        );
    });
});

describe('RegistryExtension', () => {
    test('returns the same registry for the same type', () => {
        const registries = new RegistryExtension(createOmu());
        const type = RegistryType.createJson('com.example:test', {
            name: 'settings',
            defaultValue: { enabled: false },
        });

        expect(registries.get(type)).toBe(registries.get(type));
    });

    test('rejects duplicate app-local registry names', () => {
        const registries = new RegistryExtension(createOmu());
        registries.json('settings', {
            default: { enabled: false },
        });

        expect(() => registries.json('settings', {
            default: { enabled: true },
        })).toThrow(
            "Registry with name 'settings' already exists",
        );
    });
});
