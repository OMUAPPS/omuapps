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

export class Socket {
    private readonly payload: BufferedDataChannel;
    private readonly negotiate: BufferedDataChannel;
    private readonly mediaConns: Record<string, PeerConnection> = {};

    constructor(
        private readonly connector: RTCConnector,
        private readonly handlers: {
            open?: () => void;
            payload?: (sender: PeerConnection, payload: Payload) => void;
            mediaAdded?: (sender: PeerConnection, stream: MediaStream) => void;
        },
    ) {
        this.payload = connector.createDataChannel('payload');
        this.payload.onmessage = (sender, data) => {
            const reader = ByteReader.fromUint8Array(data);
            const payload = reader.readJSON<Payload>();
            handlers.payload?.(sender, payload);
        };
        this.negotiate = connector.createDataChannel('negotiate');
    }

    send(to: PeerConnection, payload: Payload) {
        const writer = new ByteWriter();
        writer.writeJSON(payload);
        this.payload.send(writer.toUint8Array(), to);
    }

    requestStream(target: PeerConnection) {
        this.mediaConns[target.id]?.close();
        const sdpTransport = DataChannelSDPTransport.new(target, this.negotiate);
        this.mediaConns[target.id] = new RTCConnector(sdpTransport, target.id).connect(target.id);
        this.mediaConns[target.id].listenMediaStream((stream) => this.handlers.mediaAdded?.(target, stream));
        this.send(target, { type: 'request' });
    }

    setStream(to: PeerConnection, stream: MediaStream) {
        const sdpTransport = DataChannelSDPTransport.new(to, this.negotiate);
        this.mediaConns[to.id] = new RTCConnector(sdpTransport, to.id).connect(to.id);
        this.mediaConns[to.id].addMediaStream(stream);
        this.mediaConns[to.id].offer();
    }
}
