import type { Client } from '../../client.js';
import type { Unlisten } from '../../event-emitter.js';
import { Identifier, IdentifierMap } from '../../identifier.js';
import { PacketType } from '../../network/packet/index.js';
import { Serializer } from '../../serializer.js';
import { ExtensionType, type Extension } from '../extension.js';

import { SignalPacket, SignalRegisterPacket } from './packets.js';
import type { Signal } from './signal.js';
import { SignalType } from './signal.js';

export const SIGNAL_EXTENSION_TYPE = new ExtensionType(
    'signal',
    (client: Client) => new SignalExtension(client),
);

const SIGNAL_REGISTER_PACKET = PacketType.createSerialized<SignalRegisterPacket>(
    SIGNAL_EXTENSION_TYPE,
    {
        name: 'register',
        serializer: SignalRegisterPacket,
    },
);
const SIGNAL_LISTEN_PACKET = PacketType.createJson<Identifier>(SIGNAL_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Serializer.model(Identifier),
});
const SIGNAL_NOTIFY_PACKET = PacketType.createSerialized<SignalPacket>(SIGNAL_EXTENSION_TYPE, {
    name: 'notify',
    serializer: SignalPacket,
});

export class SignalExtension implements Extension {
    public readonly type = SIGNAL_EXTENSION_TYPE;
    private readonly signals = new IdentifierMap<SignalType<unknown>>();

    constructor(private readonly client: Client) {
        client.network.registerPacket(
            SIGNAL_REGISTER_PACKET,
            SIGNAL_LISTEN_PACKET,
            SIGNAL_NOTIFY_PACKET,
        );
    }

    private createSignal<T>(signalType: SignalType<T>): Signal<T> {
        if (this.signals.has(signalType.id)) {
            throw new Error(`Signal for key ${signalType.id} already created`);
        }
        return new SignalImpl(this.client, signalType);
    }

    public create<T>(name: string): Signal<T> {
        const id = this.client.app.id.join(name);
        const type = SignalType.createJson<T>(id, { name });
        return this.createSignal(type);
    }

    public get<T>(signalType: SignalType<T>): Signal<T> {
        return this.createSignal(signalType);
    }
}

class SignalImpl<T> implements Signal<T> {
    private readonly listeners: ((value: T) => void)[] = [];
    private listening = false;

    constructor(
        private readonly client: Client,
        private readonly type: SignalType<T>,
    ) {
        client.network.addPacketHandler(SIGNAL_NOTIFY_PACKET, (data) => this.handleBroadcast(data));
        client.network.addTask(() => this.onTask());
    }

    public notify(body: T): void {
        const data = this.type.serializer.serialize(body);
        this.client.send(SIGNAL_NOTIFY_PACKET, {
            id: this.type.id,
            body: data,
        });
    }

    public listen(handler: (value: T) => void): Unlisten {
        if (!this.listening) {
            this.client.onReady(() => {
                this.client.send(SIGNAL_LISTEN_PACKET, this.type.id);
            });
            this.listening = true;
        }
        this.listeners.push(handler);
        return () => {
            this.listeners.splice(this.listeners.indexOf(handler), 1);
        };
    }

    private handleBroadcast(data: SignalPacket): void {
        if (!data.id.isEqual(this.type.id)) {
            return;
        }
        const body = this.type.serializer.deserialize(data.body);
        for (const listener of this.listeners) {
            listener(body);
        }
    }

    private onTask(): void {
        if (!this.type.id.isSubpathOf(this.client.app.id)) {
            return;
        }
        this.client.send(SIGNAL_REGISTER_PACKET, {
            id: this.type.id,
            permissions: this.type.permissions,
        });
    }
}
