import { Identifier, type Omu } from '@omujs/omu';
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import type { BufferedDataChannel } from './bufferedchannel';
import { DataChannelSDPTransport, RTCConnector, SignalServerSDPTransport, type LoginOptions, type ParticipantInfo, type PeerConnection } from './signaling';

export type MediaInfo = {
    thumbnail?: string;
};

export type Payload = {
    type: 'ready';
} | {
    type: 'request';
} | {
    type: 'sharing';
} | {
    type: 'share_started';
    info: MediaInfo;
};

type StreamStarted = {
    type: 'started';
    info: MediaInfo;
    request: () => void;
};

type StreamPlaying = {
    type: 'playing';
    info: MediaInfo;
    media: MediaStream;
    close: () => void;
};

export type SocketParticipant = ParticipantInfo & {
    side: 'page' | 'asset';
    userId: string;
    stream?: StreamStarted | StreamPlaying;
};

type ShareResult = {
    media: MediaStream;
    thumbnail?: string;
};

export interface SocketHandler {
    loggedIn(): void;
    getStream?(): Promise<ShareResult | undefined>;
    handleStreamStarted?(sender: PeerConnection, stream: StreamStarted): void;
    handleStreamPlaying?(sender: PeerConnection, stream: StreamPlaying): void;
    updateParticipants(participants: Record<string, SocketParticipant>): void;
    share?(): Promise<ShareResult>;
}

export class Socket {
    private readonly payload: BufferedDataChannel;
    private readonly negotiate: BufferedDataChannel;
    private readonly mediaConns: Record<string, PeerConnection> = {};
    private readonly connections: Record<string, PeerConnection> = {};
    private readonly participants: Record<string, SocketParticipant> = {};
    private media: MediaStream | undefined = undefined;

    constructor(
        private readonly connector: RTCConnector,
        private readonly handlers: SocketHandler,
    ) {
        this.payload = connector.createDataChannel('payload');
        this.payload.onmessage = (sender, data) => {
            const reader = ByteReader.fromUint8Array(data);
            const payload = reader.readJSON<Payload>();
            this.handlePayload?.(sender, payload);
        };
        this.negotiate = connector.createDataChannel('negotiate');
    }

    public static async new(omu: Omu, loginInfo: LoginOptions, handler: SocketHandler): Promise<Socket> {
        const signalServer = await SignalServerSDPTransport.new(omu, loginInfo, {
            joined: () => {
                handler.loggedIn();
            },
            error(kind, message) {
                console.error(`Signaling error [${kind}]: ${message}`);
            },
            updateParticipants: async (newParticipants) => {
                console.log(newParticipants);
                for (const key of Object.keys(socket.connections)) {
                    if (newParticipants[key]) continue;
                    delete socket.connections[key];
                    delete socket.participants[key];
                }
                const newConnections: PeerConnection[] = [];
                for (const [idStr, info] of Object.entries(newParticipants)) {
                    if (idStr === loginInfo.login.id) continue;
                    if (socket.connections[idStr]) continue;

                    const id = Identifier.fromKey(idStr);
                    socket.participants[idStr] = {
                        ...info,
                        side: id.path[id.path.length - 1] === 'asset' ? 'asset' : 'page',
                        userId: id.path[id.path.length - 2],
                    };
                    console.log(`connecting to ${idStr}`);
                    const conn = socket.connections[idStr] = connector.connect(idStr);
                    newConnections.push(conn);
                    conn.offer();
                }
                if (newConnections.length > 0) {
                    const stream = await handler.getStream?.();
                    for (const conn of newConnections) {
                        if (stream) {
                            socket.send(conn, {
                                type: 'share_started',
                                info: { thumbnail: stream.thumbnail },
                            });
                        }
                    }
                }
                handler.updateParticipants(socket.participants);
            },
        });

        const connector = new RTCConnector(signalServer, loginInfo.login.id);
        const socket = new Socket(connector, handler);
        return socket;
    }

    handlePayload(sender: PeerConnection, payload: Payload) {
        console.log(sender.id, payload);
        if (payload.type === 'request') {
            if (!this.media) {
                console.warn('No stream to share');
                return;
            }
            this.setStream(sender, this.media);
        } else if (payload.type === 'share_started') {
            console.log(`Participant ${sender.id} started sharing`);
            const stream: StreamStarted = {
                type: 'started',
                request: () => this.requestStream(sender, payload.info),
                info: payload.info,
            };
            this.participants[sender.id].stream = stream;
            this.handlers.handleStreamStarted?.(sender, stream);
            this.handlers.updateParticipants(this.participants);
        }
    }

    send(to: PeerConnection, payload: Payload) {
        const writer = new ByteWriter();
        writer.writeJSON(payload);
        this.payload.send(writer.toUint8Array(), to);
    }

    broadcastPayload(payload: Payload) {
        for (const peer of Object.values(this.connections)) {
            this.send(peer, payload);
        }
    };

    requestStream(target: PeerConnection, info: MediaInfo) {
        this.mediaConns[target.id]?.close();
        const sdpTransport = DataChannelSDPTransport.new(target, this.negotiate);
        this.mediaConns[target.id] = new RTCConnector(sdpTransport, target.id).connect(target.id);
        this.mediaConns[target.id].listenMediaStream((media) => {
            const stream: StreamPlaying = {
                type: 'playing',
                info,
                media,
                close: () => this.closeStream(target, info),
            };
            this.participants[target.id].stream = stream;
            this.handlers.handleStreamPlaying?.(target, stream);
            this.handlers.updateParticipants(this.participants);
        });
        this.send(target, { type: 'request' });
    }

    setStream(to: PeerConnection, stream: MediaStream) {
        const sdpTransport = DataChannelSDPTransport.new(to, this.negotiate);
        this.mediaConns[to.id] = new RTCConnector(sdpTransport, to.id).connect(to.id);
        this.mediaConns[to.id].addMediaStream(stream);
        this.mediaConns[to.id].offer();
    }

    closeStream(target: PeerConnection, info: MediaInfo) {
        this.mediaConns[target.id].close();
        this.participants[target.id].stream = {
            type: 'started',
            info,
            request: () => this.requestStream(target, info),
        };
        this.handlers.updateParticipants(this.participants);
    }

    async share() {
        if (!this.handlers.share) {
            console.error('Streaming function not set');
            return;
        }
        this.broadcastPayload({
            type: 'sharing',
        });
        const { media, thumbnail } = await this.handlers.share();
        this.media = media;
        this.broadcastPayload({
            type: 'share_started',
            info: { thumbnail },
        });
    }
}
