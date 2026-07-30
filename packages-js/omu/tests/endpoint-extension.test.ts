import { describe, expect, test } from 'bun:test';

import { EndpointType } from '../src/api/endpoint/endpoint';
import { EndpointExtension } from '../src/api/endpoint/extension';
import type { Identifier } from '../src/identifier';
import type { DisconnectReason } from '../src/errors';
import type { Omu } from '../src/omu';

type PacketHandler = (data: unknown) => void;
type DisconnectHandler = (reason: DisconnectReason | undefined) => void;

function createOmu(): {
    omu: Omu;
    disconnect: (reason?: DisconnectReason) => void;
} {
    const handlers = new Map<string, PacketHandler>();
    let disconnectHandler: DisconnectHandler = () => {};
    const network = {
        registerPacket: () => {},
        addPacketHandler: (
            type: { id: Identifier },
            handler: PacketHandler,
        ) => {
            handlers.set(type.id.key(), handler);
        },
        addTask: () => {},
        on: (event: string, handler: DisconnectHandler) => {
            if (event === 'disconnected') {
                disconnectHandler = handler;
            }
            return () => {};
        },
    };
    const omu = {
        network,
        running: false,
        send: async () => {},
    } as unknown as Omu;

    return {
        omu,
        disconnect: (reason) => disconnectHandler(reason),
    };
}

const ENDPOINT = EndpointType.createJson<null, null>('com.example:test', {
    name: 'wait',
});

describe('EndpointExtension', () => {
    test('rejects pending calls when the connection closes', async () => {
        const { omu, disconnect } = createOmu();
        const endpoints = new EndpointExtension(omu);
        const call = endpoints.call(ENDPOINT, null);

        disconnect();

        await expect(call).rejects.toThrow(
            'Disconnected before endpoint responded',
        );
    });

    test('rejects calls that exceed their timeout', async () => {
        const { omu } = createOmu();
        const endpoints = new EndpointExtension(omu);

        await expect(endpoints.call(ENDPOINT, null, {
            timeout: 1,
        })).rejects.toThrow(
            'Endpoint com.example:test/wait timed out after 1ms',
        );
    });

    test('allows calls without a timeout', async () => {
        const { omu, disconnect } = createOmu();
        const endpoints = new EndpointExtension(omu);
        const call = endpoints.call(ENDPOINT, null, {
            timeout: null,
        });

        disconnect();

        await expect(call).rejects.toThrow(
            'Disconnected before endpoint responded',
        );
    });

    for (const timeout of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        test(`rejects invalid timeout ${timeout}`, async () => {
            const { omu } = createOmu();
            const endpoints = new EndpointExtension(omu);

            await expect(endpoints.call(ENDPOINT, null, {
                timeout,
            })).rejects.toThrow(
                'Endpoint timeout must be a positive finite number or null',
            );
        });
    }
});
