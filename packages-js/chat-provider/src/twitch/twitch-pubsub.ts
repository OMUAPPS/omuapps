export type PubSubListener = (message: unknown) => Promise<void> | void;

type ServerPacket = {
    type: string;
    data?: { topic: string; message: string };
};

export class TwitchPubSub {
    private static readonly URL = 'wss://pubsub-edge.twitch.tv/v1';
    private static readonly PING_INTERVAL_MS = 60_000;
    private static readonly RECONNECT_DELAY_MS = 5_000;

    private readonly subscriptions = new Map<string, PubSubListener>();
    private socket: WebSocket | undefined;
    private ping: ReturnType<typeof setInterval> | undefined;
    private closed = false;

    public async connect(): Promise<void> {
        const socket = new WebSocket(TwitchPubSub.URL);
        await new Promise<void>((resolve, reject) => {
            socket.addEventListener('open', () => resolve(), { once: true });
            socket.addEventListener('error', () => reject(new Error('Failed to connect to Twitch PubSub')), { once: true });
        });
        socket.addEventListener('message', (event) => void this.receive(String(event.data)));
        socket.addEventListener('close', () => this.reconnect());
        this.socket = socket;
        clearInterval(this.ping);
        this.ping = setInterval(() => this.send({ type: 'PING' }), TwitchPubSub.PING_INTERVAL_MS);
        if (this.subscriptions.size > 0) this.send({ type: 'LISTEN', data: { topics: [...this.subscriptions.keys()] } });
    }

    public subscribe(topic: string, listener: PubSubListener): void {
        if (this.subscriptions.has(topic)) throw new Error(`Topic ${topic} already subscribed`);
        this.subscriptions.set(topic, listener);
        this.send({ type: 'LISTEN', data: { topics: [topic] } });
    }

    public unsubscribe(topic: string): void {
        if (!this.subscriptions.delete(topic)) return;
        this.send({ type: 'UNLISTEN', data: { topics: [topic] } });
    }

    public close(): void {
        this.closed = true;
        clearInterval(this.ping);
        this.socket?.close();
    }

    private send(packet: object): void {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        this.socket.send(JSON.stringify(packet));
    }

    private async receive(data: string): Promise<void> {
        const packet: ServerPacket = JSON.parse(data);
        if (packet.type !== 'MESSAGE' || !packet.data) return;
        const listener = this.subscriptions.get(packet.data.topic);
        if (!listener) {
            console.error(`[Twitch] No subscription for topic: ${packet.data.topic}`);
            return;
        }
        try {
            await listener(JSON.parse(packet.data.message));
        } catch (error) {
            console.error(`[Twitch] Error handling topic ${packet.data.topic}`, error);
        }
    }

    private reconnect(): void {
        clearInterval(this.ping);
        if (this.closed) return;
        setTimeout(() => {
            if (this.closed) return;
            this.connect().catch((error) => {
                console.warn('[Twitch] PubSub reconnect failed', error);
                this.reconnect();
            });
        }, TwitchPubSub.RECONNECT_DELAY_MS);
    }
}
