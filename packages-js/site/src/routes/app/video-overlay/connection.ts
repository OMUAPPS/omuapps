import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import type { BufferedDataChannel } from './bufferedchannel';

export type Payload = {
    type: 'ready';
} | {
    type: 'request';
} | {
    type: 'sharing';
} | {
    type: 'share_started';
    thumbnail: string;
};

export class Connection {
    constructor(
        private readonly channel: BufferedDataChannel,
        public callbacks: {
            open?: () => void;
            close?: () => void;
            payload: (payload: Payload) => void;
        },
    ) {
        channel.onopen = () => {
            callbacks.open?.();
        };
        channel.onclose = () => {
            callbacks.close?.();
        };
        channel.onmessage = (data) => {
            const reader = ByteReader.fromUint8Array(data);
            const payload = reader.readJSON<Payload>();
            callbacks.payload?.(payload);
        };
    }

    send(payload: Payload) {
        const writer = new ByteWriter();
        writer.writeJSON(payload);
        this.channel.send(writer.toUint8Array());
    }

    public destroy() {
        this.channel.channel.close();
    }
}
