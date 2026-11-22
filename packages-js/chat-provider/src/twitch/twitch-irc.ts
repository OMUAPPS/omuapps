export class IrcCommand {
    public constructor(
        public readonly params: Record<string, string> = {},
        public readonly args: string[][] = [],
    ) {}

    public static parse(line: string): IrcCommand {
        const data = line.startsWith(':') ? line.slice(1) : line;
        const parts = data.split(' :');
        let params: Record<string, string> = {};
        if (data.startsWith('@')) {
            params = IrcCommand.parseParams((parts.shift() ?? '').slice(1));
        }
        return new IrcCommand(params, parts.filter((part) => part.length > 0).map((part) => part.split(' ')));
    }

    public static cap(...capabilities: string[]): IrcCommand {
        return new IrcCommand({}, [['CAP', 'REQ'], capabilities]);
    }

    public static nick(nick: string): IrcCommand {
        return new IrcCommand({}, [['NICK', nick]]);
    }

    public static user(nick: string): IrcCommand {
        return new IrcCommand({}, [['USER', nick, '8', '*'], [nick]]);
    }

    public static join(room: string): IrcCommand {
        return new IrcCommand({}, [['JOIN', `#${room}`]]);
    }

    public static part(room: string): IrcCommand {
        return new IrcCommand({}, [['PART', `#${room}`]]);
    }

    public static pong(): IrcCommand {
        return new IrcCommand({}, [['PONG']]);
    }

    public format(): string {
        const parts: string[] = [];
        const params = Object.entries(this.params);
        if (params.length > 0) parts.push(`@${params.map(([key, value]) => `${key}=${value}`).join(';')}`);
        parts.push(...this.args.map((arg) => arg.join(' ')));
        return parts.join(' :');
    }

    public packet(): IrcPacket | undefined {
        const [first, ...rest] = this.args;
        if (!first) return;
        if (first.length === 1) return new IrcPacket(this.params, '', first[0], rest);
        return new IrcPacket(this.params, first[0], first[1], rest);
    }

    private static parseParams(text: string): Record<string, string> {
        const params: Record<string, string> = {};
        for (const pair of text.split(';')) {
            if (!pair) continue;
            const index = pair.indexOf('=');
            if (index === -1) params[pair] = '';
            else params[pair.slice(0, index)] = pair.slice(index + 1);
        }
        return params;
    }
}

export class IrcPacket {
    public constructor(
        public readonly params: Record<string, string>,
        public readonly sender: string,
        public readonly action: string,
        public readonly args: string[][],
    ) {}

    public get text(): string {
        return this.args.map((arg) => arg.join(' ')).join(' :');
    }
}

export type IrcHandler = (packet: IrcPacket) => Promise<void> | void;

export class TwitchIrc {
    private static readonly NICK = 'justinfan2576';

    private socket: WebSocket | undefined;

    public constructor(private readonly handlers: Record<string, IrcHandler>) {}

    public async connect(): Promise<void> {
        if (this.socket) throw new Error('Already connected');
        const socket = new WebSocket('wss://irc-ws.chat.twitch.tv/');
        await new Promise<void>((resolve, reject) => {
            socket.addEventListener('open', () => resolve(), { once: true });
            socket.addEventListener('error', () => reject(new Error('Failed to connect to Twitch IRC')), { once: true });
        });
        socket.addEventListener('message', (event) => void this.receive(String(event.data)));
        this.socket = socket;
        this.send(IrcCommand.cap('twitch.tv/tags', 'twitch.tv/commands'));
        this.send(IrcCommand.nick(TwitchIrc.NICK));
        this.send(IrcCommand.user(TwitchIrc.NICK));
    }

    public join(login: string): void {
        this.send(IrcCommand.join(login));
    }

    public part(login: string): void {
        this.send(IrcCommand.part(login));
    }

    public send(command: IrcCommand): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error('Socket is not connected');
        this.socket.send(command.format());
    }

    public close(): void {
        this.socket?.close();
        this.socket = undefined;
    }

    private async receive(data: string): Promise<void> {
        for (const line of data.split('\r\n')) {
            if (!line) continue;
            const packet = IrcCommand.parse(line).packet();
            if (!packet) continue;
            const handler = this.handlers[packet.action];
            if (!handler) {
                if (!/^\d+$/.test(packet.action)) console.warn(`[Twitch] Unknown action ${packet.action}`);
                continue;
            }
            try {
                await handler(packet);
            } catch (error) {
                console.error(`[Twitch] Error handling command ${packet.action}`, error);
            }
        }
    }
}
