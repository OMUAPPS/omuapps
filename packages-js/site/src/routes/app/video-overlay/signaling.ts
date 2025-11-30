import type { Omu } from '@omujs/omu';
import type { OmuWS } from '@omujs/omu/api/http';
import { ByteReader, ByteWriter } from '@omujs/omu/serialize';
import { BufferedDataChannel, type ReservedChannel } from './bufferedchannel';

const RTC_CONFIGURATION: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun.cloudflare.com:3478',
            ],
        },
    ],
};

export type ParticipantInfo = {
    name: string;
    version: string;
};

export type Login = {
    id: string;
    password: string;
};

export type SessionDescription = {
    type: 'answer' | 'offer' | 'pranswer' | 'rollback';
    sdp: string;
};

export type Join = {
    type: 'join';
    login: Login;
    auth: Login;
    info: ParticipantInfo;
};

export type Joined = {
    type: 'joined';
};

export type Offer = {
    type: 'offer';
    id: string;
    sender: string;
    to: string;
    sdp: SessionDescription;
};

export type Answer = {
    type: 'answer';
    id: string;
    sender: string;
    to: string;
    sdp: SessionDescription;
};

export type Candidate = {
    type: 'candidate';
    id: string;
    sender: string;
    to: string;
    candidate: RTCLocalIceCandidateInit | null;
};

export type Update = {
    type: 'update';
    participants: Record<string, ParticipantInfo>;
};

export type SDPPacket = Offer | Answer | Candidate;

export type ErrorKind = 'invalid_packet' | 'invalid_login' | 'invalid_password' | 'participant_not_found';

export type S2CPacket = Update | SDPPacket | Joined | {
    type: 'error';
    kind: ErrorKind;
    message: string;
};

type ReceiveResult = { type: 'receive'; packet: SDPPacket } | { type: 'closed' };

interface SDPTransport {
    sendSDP(sdp: SDPPacket): void;
    receiveSDP(): Promise<ReceiveResult>;
}

type SignalServerEvents = {
    joined?: () => void;
    error?: (kind: ErrorKind, message: string) => void;
    updateParticipants?: (participants: Record<string, ParticipantInfo>) => void;
};

export class SignalServerSDPTransport implements SDPTransport {
    private readonly sdpQueue: SDPPacket[] = [];
    private sdpResolve: () => void = () => {};

    private constructor(
        private readonly ws: OmuWS,
        private readonly handlers: SignalServerEvents,
        public readonly id: string,
    ) {
        this.receiveLoop();
    }

    public static async new(omu: Omu, options: Omit<Join, 'type'>, handlers: SignalServerEvents) {
        const ws = await omu.http.ws('wss://signal.omuapps.com/ws');
        const signaling = new SignalServerSDPTransport(ws, handlers, options.login.id);
        signaling.sendSDP({
            type: 'join',
            ...options,
        });
        return signaling;
    }

    sendSDP(sdp: SDPPacket | Join): void {
        this.ws.send(JSON.stringify(sdp));
    }

    async receiveLoop(): Promise<ReceiveResult> {
        while (true) {
            const msg = await this.ws.receive();
            if (msg.type === 'open') continue;
            if (msg.type === 'close') {
                return { type: 'closed' };
            }
            if (msg.type !== 'text') {
                console.log(`Expected text, but an Invalid data type ${msg.type} was received`);
                continue;
            }
            const payload: S2CPacket = JSON.parse(msg.data);
            if (payload.type === 'update') {
                this.handlers.updateParticipants?.(payload.participants);
                continue;
            } else if (payload.type === 'joined') {
                this.handlers.joined?.();
            } else if (payload.type === 'error') {
                this.handlers.error?.(payload.kind, payload.message);
            } else {
                this.sdpQueue.push(payload);
                this.sdpResolve();
            }
        }
    }

    async receiveSDP(): Promise<ReceiveResult> {
        while (true) {
            const packet = this.sdpQueue.shift();
            if (!packet) {
                const { promise, resolve } = Promise.withResolvers();
                this.sdpResolve = resolve;
                const cancelled = await promise;
                if (cancelled) {
                    return { type: 'closed' };
                }
                continue;
            }
            return { type: 'receive', packet };
        }
    }
}

export class DataChannelSDPTransport implements SDPTransport {
    private constructor(
        private readonly connection: PeerConnection,
        private readonly channel: BufferedDataChannel,
    ) {}

    private readonly receiveQueue: SDPPacket[] = [];
    private receiveResolve: () => void = () => {};

    public static new(connection: PeerConnection, channel: BufferedDataChannel): DataChannelSDPTransport {
        const transport = new DataChannelSDPTransport(connection, channel);
        channel.onmessage = (from, data) => {
            if (from !== connection) return;
            const reader = ByteReader.fromUint8Array(data);
            const packet = reader.readJSON<SDPPacket>();
            transport.receiveQueue.push(packet);
            transport.receiveResolve();
        };
        return transport;
    }

    sendSDP(sdp: SDPPacket): void {
        const writer = new ByteWriter();
        writer.writeJSON(sdp);
        this.channel.send(writer.toUint8Array(), this.connection);
    }

    async receiveSDP(): Promise<ReceiveResult> {
        while (true) {
            const packet = this.receiveQueue.shift();
            if (!packet) {
                const { promise, resolve } = Promise.withResolvers<boolean>();
                this.receiveResolve = resolve;
                const cancel = await promise;
                if (cancel) {
                    return { type: 'closed' };
                }
                continue;
            }
            return { type: 'receive', packet };
        }
    }
}

export interface PeerConnection {
    id: string;
    peer: RTCPeerConnection;
    offer(): void;
    addMediaStream(stream: MediaStream): void;
    listenMediaStream(callback: (stream: MediaStream) => void): () => void;
    close(): void;
}

export class RTCConnector {
    private readonly connections: Record<string, PeerConnection> = {};
    private channels: Record<string, ReservedChannel> = {};
    private medias: Record<string, RTCRtpSender> = {};
    private mediaCallbacks: ((stream: MediaStream) => void)[] = [];

    constructor(
        private readonly transport: SDPTransport,
        private readonly sender: string,
    ) {
        this.receiveLoop();
    }

    private async receiveLoop() {
        while (true) {
            const result = await this.transport.receiveSDP();
            if (result.type === 'receive') {
                this.handleSDPPacket(result.packet);
            }
        }
    }

    private async handleSDPPacket(packet: SDPPacket) {
        switch (packet.type) {
            case 'offer': {
                const { peer } = this.createConnection(packet.id, packet.sender);

                await peer.setRemoteDescription(packet.sdp);

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                this.transport.sendSDP({
                    type: 'answer',
                    sdp: {
                        type: 'answer',
                        sdp: answer.sdp!,
                    },
                    id: packet.id,
                    sender: this.sender,
                    to: packet.sender,
                });
                break;
            }
            case 'answer': {
                const connection = this.connections[packet.id];
                if (!connection) {
                    console.log('No connection for answer from', packet.sender);
                    return;
                }
                const { peer: peer } = connection;
                if (peer.signalingState === 'stable') {
                    console.warn('Received unexpected answer from', packet.sender);
                    return;
                }
                await peer.setRemoteDescription(packet.sdp);
                break;
            }
            case 'candidate': {
                const connection = this.connections[packet.id];
                if (connection && connection.peer.remoteDescription) {
                    const { peer } = connection;
                    await peer.addIceCandidate(packet.candidate);
                }
                break;
            }
        }
    }

    private counter = 0;

    public connect(to: string) {
        const sdpId = `${to}-${this.counter++}`;
        return this.createConnection(sdpId, to);
    }

    public createConnection(sdpId: string, to: string) {
        const peer = new RTCPeerConnection(RTC_CONFIGURATION);

        peer.addEventListener('iceconnectionstatechange', () => {
            console.log(`ICE connection state changed: ${peer.iceConnectionState}`);
        });

        peer.addEventListener('icegatheringstatechange', () => {
            console.log(`ICE gathering state changed: ${peer.iceGatheringState}`);
        });

        peer.onicecandidate = (event) => {
            console.log('ICE candidate:', event.candidate ? event.candidate.candidate : '(null)');
            this.transport.sendSDP({
                type: 'candidate',
                candidate: event.candidate,
                id: sdpId,
                sender: this.sender,
                to,
            });
        };
        peer.ontrack = (event) => {
            this.mediaCallbacks.forEach((it) => it(event.streams[0]));
        };
        peer.ondatachannel = ({ channel }) => {
            console.log(to, 'data channel', channel);
            this.channels[channel.label].attachReceiver(connection, channel);
        };
        const connection: PeerConnection = this.connections[sdpId] = {
            id: to,
            peer: peer,
            offer: async () => {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                this.transport.sendSDP({
                    type: 'offer',
                    sdp: {
                        type: 'offer',
                        sdp: offer.sdp!,
                    },
                    id: sdpId,
                    sender: this.sender,
                    to,
                });
            },
            addMediaStream: (stream: MediaStream) => {
                for (const track of Object.values(this.medias)) {
                    peer.removeTrack(track);
                }
                for (const track of stream.getTracks()) {
                    this.medias[track.id] = peer.addTrack(track, stream);
                }
            },
            listenMediaStream: (callback: (stream: MediaStream) => void) => {
                this.mediaCallbacks.push(callback);
                return () => {
                    const index = this.mediaCallbacks.indexOf(callback);
                    this.mediaCallbacks.splice(index, 1);
                };
            },
            close: () => {
                peer.close();
                delete this.connections[sdpId];
            },
        };
        for (const channel of Object.values(this.channels)) {
            channel.attachSender(connection, peer.createDataChannel(channel.channel.label));
        }
        peer.addIceCandidate();
        return connection;
    }

    createDataChannel(label: string): BufferedDataChannel {
        const channel = BufferedDataChannel.reserve(label);
        this.channels[label] = channel;
        return channel.channel;
    }
}
