import type { Unlisten } from '../../event';
import { Identifier, IdentifierMap } from '../../identifier';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { JsonType, Serializable } from '../../serialize';
import { ExtensionType, type Extension } from '../extension.js';
import { SignalPacket, SignalRegisterPacket } from './packets.js';
import { SignalType, type Signal } from './signal.js';

export const SIGNAL_EXTENSION_TYPE: ExtensionType<SignalExtension> = new ExtensionType(
    'signal',
    (omu: Omu) => new SignalExtension(omu),
);

const SIGNAL_REGISTER_PACKET = PacketType.createJson<SignalRegisterPacket>(SIGNAL_EXTENSION_TYPE, {
    name: 'register',
    serializer: SignalRegisterPacket,
});
const SIGNAL_LISTEN_PACKET = PacketType.createJson<Identifier>(SIGNAL_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Identifier,
});
const SIGNAL_NOTIFY_PACKET = PacketType.createSerialized<SignalPacket>(SIGNAL_EXTENSION_TYPE, {
    name: 'notify',
    serializer: SignalPacket,
});

export class SignalExtension implements Extension {
    public readonly type: ExtensionType<SignalExtension> = SIGNAL_EXTENSION_TYPE;
    private readonly signals = new IdentifierMap<Signal<unknown>>();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            SIGNAL_REGISTER_PACKET,
            SIGNAL_LISTEN_PACKET,
            SIGNAL_NOTIFY_PACKET,
        );
    }

    private createSignal<T>(signalType: SignalType<T>): Signal<T> {
        if (this.signals.has(signalType.id)) {
            throw new Error(`Signal with identifier '${signalType.id.key()}' already exists`);
        }
        const signal = new SignalImpl(this.omu, signalType);
        this.signals.set(signalType.id, signal as Signal<unknown>);
        return signal;
    }

    public json<T, D extends JsonType = JsonType>(name: string, options?: { serializer?: Serializable<T, D> }): Signal<T> {
        const type = SignalType.createJson<T>(this.omu.app.id.base, {
            name,
            serializer: options?.serializer,
        });
        return this.createSignal(type);
    }

    public serialized<T>(name: string, options: { serializer: Serializable<T, Uint8Array> }): Signal<T> {
        const type = SignalType.createSerialized<T>(this.omu.app.id.base, {
            name,
            serializer: options?.serializer,
        });
        return this.createSignal(type);
    }

    public get<T>(signalType: SignalType<T>): Signal<T> {
        const signal = this.signals.get(signalType.id);
        if (signal) {
            return signal as Signal<T>;
        }
        return this.createSignal(signalType);
    }
}

class SignalImpl<T> implements Signal<T> {
    private readonly listeners: ((value: T) => void)[] = [];
    private listening = false;

    constructor(
        private readonly omu: Omu,
        public readonly type: SignalType<T>,
    ) {
        omu.network.addPacketHandler(SIGNAL_NOTIFY_PACKET, (data) => this.handleBroadcast(data));
        omu.network.addTask(() => this.onTask());
    }

    public async notify(body: T): Promise<void> {
        const data = this.type.serializer.serialize(body);
        await this.omu.send(SIGNAL_NOTIFY_PACKET, {
            id: this.type.id,
            body: data,
        });
        for (const listener of this.listeners) {
            listener(body);
        }
    }

    public listen(handler: (value: T) => void): Unlisten {
        if (!this.listening) {
            this.omu.onReady(() => {
                this.omu.send(SIGNAL_LISTEN_PACKET, this.type.id);
            });
            this.listening = true;
        }
        this.listeners.push(handler);
        return () => {
            const index = this.listeners.indexOf(handler);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
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
        if (!this.type.id.isSubpathOf(this.omu.app.id)) {
            return;
        }
        this.omu.send(SIGNAL_REGISTER_PACKET, {
            id: this.type.id,
            permissions: this.type.permissions,
        });
    }
}
