import type { Omu } from '@omujs/omu';
import type { OmuWS } from '@omujs/omu/api/http';
import { BufferedDataChannel } from './bufferedchannel';

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
    to: string;
    sdp: SessionDescription;
};

export type Offered = {
    type: 'offer';
    sender: string;
    sdp: SessionDescription;
};

export type Answer = {
    type: 'answer';
    to: string;
    sdp: SessionDescription;
};

export type Answered = {
    type: 'answer';
    sender: string;
    sdp: SessionDescription;
};

export type Candidate = {
    type: 'candidate';
    sender: string;
    to: string;
    candidate: RTCLocalIceCandidateInit | null;
};

export type Update = {
    type: 'update';
    participants: Record<string, ParticipantInfo>;
};

export type C2SPacket = Join | Offer | Answer | Candidate;

export type ErrorKind = 'invalid_packet' | 'invalid_login' | 'invalid_password' | 'parcitipant_not_found';

export type S2CPacket = Update | Offered | Answered | Candidate | Joined | {
    type: 'error';
    kind: ErrorKind;
    message: string;
};

export type PeerConnection = {
    id: string;
    peer: RTCPeerConnection;
    channels: Record<string, RTCDataChannel>;
    streams: Record<string, MediaStream>;
};

export type OutgoingConnection = PeerConnection & {
    offer(): Promise<void>;
    createDataChannel(label: string): BufferedDataChannel;
    addStream(stream: MediaStream): void;
};

export class Signaling {
    private constructor(
        private readonly socket: OmuWS,
        public readonly options: Omit<Join, 'type'>,
        public readonly events: {
            onParticipantUpdate?: (participants: Record<string, ParticipantInfo>) => void;
            onStreamAdded?: (connection: PeerConnection, stream: MediaStream) => void;
            onChannelAdded?: (connection: PeerConnection, channel: BufferedDataChannel) => void;
            onJoined?: () => void;
            onError?: (kind: ErrorKind, message: string) => void;
        } = {
            onParticipantUpdate: undefined,
        },
        public parcitipants: Record<string, ParticipantInfo> = {},
        private outgoingConnections: Record<string, OutgoingConnection | undefined> = {},
        private incomingConnections: Record<string, PeerConnection | undefined> = {},
        private running = true,
        private joined = false,
    ) {}

    public static async new(
        omu: Omu,
        options: Omit<Join, 'type'>,
        events: Signaling['events'] = {},
    ) {
        const ws = await omu.http.ws('wss://signal.omuapps.com/ws');
        const signaling = new Signaling(ws, options, events);
        signaling.send({
            type: 'join',
            ...options,
        });
        signaling.receiveLoop();
        return signaling;
    }

    public send(packet: C2SPacket) {
        this.socket.send(JSON.stringify(packet));
    }

    private async receiveLoop() {
        while (this.running) {
            const msg = await this.socket.receive();
            if (msg.type === 'close') {
                break;
            } else if (msg.type === 'open') {
                continue;
            } else if (msg.type === 'error') {
                throw new Error(`Error received while Discord RPC receiving: ${msg.type}`);
            } else if (msg.type !== 'text') {
                throw new Error(`Excepted text but got ${msg.type}: ${msg.data}`);
            }
            const packet: S2CPacket = JSON.parse(msg.data);
            if (packet.type === 'update') {
                this.handleUpdate(packet);
            } else if (packet.type === 'joined') {
                this.handleJoined();
            } else if (packet.type === 'error') {
                this.handleError(packet);
            } else if (packet.type === 'offer') {
                await this.handleOffer(packet);
            } else if (packet.type === 'answer') {
                await this.handleAnswer(packet);
            } else if (packet.type === 'candidate') {
                await this.handleCandidate(packet);
            }
        }
    }

    private handleUpdate(packet: Update) {
        this.parcitipants = packet.participants;
        this.events.onParticipantUpdate?.(packet.participants);
    }

    private handleJoined() {
        this.joined = true;
        this.events.onJoined?.();
    }

    private handleError(packet: { type: 'error'; kind: ErrorKind; message: string }) {
        console.error('Signaling error:', packet.kind, packet.message);
        this.events.onError?.(packet.kind, packet.message);
    }

    private async handleOffer(packet: Offered) {
        const { peer } = this.createIncomingPeerConnection(packet.sender);
        await peer.setRemoteDescription(packet.sdp);

        const answer = await peer.createAnswer();
        this.send({
            type: 'answer',
            sdp: {
                type: 'answer',
                sdp: answer.sdp!,
            },
            to: packet.sender,
        });
        await peer.setLocalDescription(answer);
    }

    private async handleAnswer(packet: Answered) {
        const connection = this.outgoingConnections[packet.sender];
        if (!connection) {
            console.log('No connection for answer from', packet.sender);
            return;
        }
        const { peer } = connection;
        if (peer.signalingState === 'stable') {
            console.warn('Received unexpected answer from', packet.sender);
            return;
        }
        await peer.setRemoteDescription(packet.sdp);
    }

    private async handleCandidate(packet: Candidate) {
        const connection = this.incomingConnections[packet.sender];
        if (connection && connection.peer.remoteDescription) {
            const { peer } = connection;
            await peer.addIceCandidate(packet.candidate);
        }
        const out = this.outgoingConnections[packet.sender];
        if (out && out.peer.remoteDescription) {
            const { peer } = out;
            await peer.addIceCandidate(packet.candidate);
        }
    }

    private createPeerConnection(to: string) {
        const peer = new RTCPeerConnection(RTC_CONFIGURATION);
        peer.onicecandidate = (e) => {
            this.send({
                type: 'candidate',
                candidate: e.candidate,
                sender: this.options.login.id,
                to,
            });
        };
        return peer;
    }

    private createIncomingPeerConnection(to: string) {
        const existing = this.incomingConnections[to];
        if (existing) {
            existing.peer.close();
        }
        const peer = this.createPeerConnection(to);
        const channels: Record<string, RTCDataChannel> = {};
        const streams: Record<string, MediaStream> = {};
        const connection = this.incomingConnections[to] = {
            id: to,
            peer,
            channels,
            streams,
        };
        peer!.addIceCandidate();
        peer!.ontrack = (e) => {
            for (const stream of e.streams) {
                streams[stream.id] = stream;
            }
            this.events.onStreamAdded?.(connection, e.streams[0]);
        };
        peer.ondatachannel = ({ channel }) => {
            channels[channel.label] = channel;
            channel.onopen = () => {
                console.log('Data channel opened:', channel.label);
            };
            channel.onmessage = (e) => {
                console.log('Data channel message:', channel.label, e.data);
            };
            this.events.onChannelAdded?.(connection, new BufferedDataChannel(channel));
        };
        return connection;
    }

    public connect(to: string) {
        const existing = this.outgoingConnections[to];
        if (existing) {
            existing.peer.close();
        }
        const peer = this.createPeerConnection(to);
        const channels: Record<string, RTCDataChannel> = {};
        const streams: Record<string, MediaStream> = {};
        const connection = this.outgoingConnections[to] = {
            id: to,
            peer,
            channels,
            streams,
            offer: async () => {
                const offer = await peer.createOffer();
                this.send({
                    type: 'offer',
                    sdp: {
                        type: 'offer',
                        sdp: offer.sdp!,
                    },
                    to,
                });

                await peer.setLocalDescription(offer);
            },
            createDataChannel: (label: string): BufferedDataChannel => {
                const channel = peer.createDataChannel(label);
                channels[label] = channel;
                channel.onerror = (e) => {
                    console.error('Data channel error:', e);
                };
                return new BufferedDataChannel(channel);
            },
            addStream: (stream: MediaStream) => {
                for (const track of stream.getTracks()) {
                    peer.addTrack(track, stream);
                }
                streams[stream.id] = stream;
            },
        };
        peer.addIceCandidate();
        return connection;
    }
}
