import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import type { BufferedDataChannel } from './bufferedchannel';
import { DataChannelSDPTransport, RTCConnector, type PeerConnection } from './signaling';

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
    public readonly payload: BufferedDataChannel;
    public readonly connector: RTCConnector;
    public mediaConn: PeerConnection;

    constructor(
        private readonly id: string,
        private readonly connection: PeerConnection,
        private readonly handlers: {
            payload?: (payload: Payload) => void;
            mediaAdded?: (stream: MediaStream) => void;
        },
    ) {
        this.payload = connection.createDataChannel('payload');
        this.payload.onmessage = (data) => {
            const reader = ByteReader.fromUint8Array(data);
            const payload = reader.readJSON<Payload>();
            console.log(payload);
            handlers.payload?.(payload);
        };
        const dataSDPTransport = DataChannelSDPTransport.new(connection.createDataChannel('negotiate'));
        this.connector = new RTCConnector(dataSDPTransport, id);
        this.mediaConn = this.connector.connect(this.connection.id);
        this.mediaConn.listenMediaStream((stream) => handlers.mediaAdded?.(stream));
    }

    send(payload: Payload) {
        const writer = new ByteWriter();
        writer.writeJSON(payload);
        this.payload.send(writer.toUint8Array());
    }

    setStream(stream: MediaStream) {
        this.mediaConn.addMediaStream(stream);
        this.mediaConn.offer();
    }
}
