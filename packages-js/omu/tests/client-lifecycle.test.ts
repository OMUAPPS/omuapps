import { describe, expect, test } from 'bun:test';

import { App } from '../src/app';
import type { Connection, Transport } from '../src/network/connection';
import { Network } from '../src/network/network';
import { Omu } from '../src/omu';

function createClient(): Omu {
    return new Omu(new App('com.example:test', {}), {
        token: 'token',
        transport: {
            connect: async () => {
                throw new Error('Unexpected connection');
            },
        },
    });
}

describe('Omu lifecycle', () => {
    test('rejects waiting before the client starts', async () => {
        const omu = createClient();

        await expect(omu.waitForReady()).rejects.toThrow(
            'Cannot wait for ready before the client has started',
        );
    });

    test('rejects readiness waiters when the client stops', async () => {
        const omu = createClient();
        omu.running = true;
        const ready = omu.waitForReady();

        omu.stop();

        await expect(ready).rejects.toThrow(
            'Client stopped before becoming ready',
        );
    });

    test('clears running state when the connection loop finishes', async () => {
        const omu = createClient();
        omu.network.connect = async () => {};

        await omu.start();

        expect(omu.running).toBeFalse();
        expect(omu.ready).toBeFalse();
    });

    test('returns network send failures to the caller', async () => {
        const omu = createClient();
        omu.network.send = async () => {
            throw new Error('send failed');
        };

        await expect(omu.send({
            id: omu.app.id.join('packet'),
            serializer: {
                serialize: () => new Uint8Array(),
                deserialize: () => null,
            },
            match: () => false,
        }, null)).rejects.toThrow('send failed');
    });
});

describe('Network lifecycle', () => {
    test('closes the active connection', () => {
        let closed = false;
        const connection: Connection = {
            closed: false,
            send: () => {},
            receive: async () => null,
            close: () => {
                closed = true;
            },
        };
        const transport: Transport = {
            connect: async () => connection,
        };
        const omu = {
            running: false,
        } as Omu;
        const network = new Network(
            omu,
            {
                host: '127.0.0.1',
                port: 26423,
                secure: false,
            },
            {
                get: async () => 'token',
            },
            transport,
            connection,
        );

        network.close();

        expect(closed).toBeTrue();
    });
});
