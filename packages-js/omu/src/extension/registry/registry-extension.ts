import type { Client } from '../../client.js';
import type { Unlisten } from '../../event-emitter.js';
import { EventEmitter } from '../../event-emitter.js';
import { Identifier, IdentifierMap } from '../../identifier.js';
import { PacketType } from '../../network/packet/index.js';
import { Serializer } from '../../serializer.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { type Extension, ExtensionType } from '../extension.js';

import { RegistryPacket, RegistryRegisterPacket } from './packets.js';
import { type Registry, RegistryType } from './registry.js';

export class RegistryExtension implements Extension {
    public readonly type: ExtensionType<RegistryExtension> = REGISTRY_EXTENSION_TYPE;
    private readonly registries = new IdentifierMap<Registry<unknown>>();

    constructor(private readonly client: Client) {
        client.network.registerPacket(
            REGISTRY_REGISTER_PACKET,
            REGISTRY_UPDATE_PACKET,
            REGISTRY_LISTEN_PACKET,
        );
    }

    private createRegistry<T>(registryType: RegistryType<T>): Registry<T> {
        this.client.permissions.require(REGISTRY_PERMISSION_ID);
        if (this.registries.has(registryType.id)) {
            throw new Error(`Registry with identifier '${registryType.id}' already exists`);
        }
        return new RegistryImpl(this.client, registryType);
    }

    public get<T>(registryType: RegistryType<T>): Registry<T> {
        const identifier = registryType.id;
        let registry = this.registries.get(identifier);
        if (registry === undefined) {
            registry = this.createRegistry(registryType);
            this.registries.set(identifier, registry);
        }
        return registry as Registry<T>;
    }

    public create<T>(name: string, options: { default: T, serializer?: Serializer<T, Uint8Array> }): Registry<T> {
        const identifier = this.client.app.id.join(name);
        if (this.registries.has(identifier)) {
            throw new Error(`Registry with name '${name}' already exists`);
        }
        const tableType = RegistryType.createSerialized<T>(identifier, {
            name,
            defaultValue: options.default,
            serializer: options.serializer ?? Serializer.json(),
        });
        return this.createRegistry(tableType);
    }
}

class RegistryImpl<T> implements Registry<T> {
    private readonly eventEmitter: EventEmitter<[T]> = new EventEmitter();
    private listening = false;
    public value: T;

    constructor(
        private readonly client: Client,
        public readonly type: RegistryType<T>,
    ) {
        this.value = type.defaultValue;
        client.network.addPacketHandler(REGISTRY_UPDATE_PACKET, (packet) =>
            this.handleUpdate(packet),
        );
        client.network.addTask(() => this.onTask());
    }

    public async get(): Promise<T> {
        const result = await this.client.endpoints.call(REGISTRY_GET_ENDPOINT, this.type.id);
        if (result.value === null) {
            return this.type.defaultValue;
        }
        return this.type.serializer.deserialize(result.value);
    }

    public async set(value: T): Promise<void> {
        this.client.send(REGISTRY_UPDATE_PACKET, {
            id: this.type.id,
            value: this.type.serializer.serialize(value),
        });
        this.eventEmitter.emit(value);
    }

    public async update(fn: (value: T) => PromiseLike<T> | T): Promise<T> {
        const value = await this.get();
        const newValue = await fn(value);
        await this.set(newValue);
        return newValue;
    }

    public async modify(fn: (value: T) => PromiseLike<T> | T): Promise<T> {
        const value = await this.get();
        const newValue = await fn(value);
        await this.set(newValue);
        return newValue;
    }

    public listen(handler: (value: T) => Promise<void> | void): Unlisten {
        if (!this.listening && this.client.ready) {
            this.client.send(REGISTRY_LISTEN_PACKET, this.type.id);
        }
        this.listening = true;
        return this.eventEmitter.listen(handler);
    }

    private handleUpdate(data: RegistryPacket): void {
        if (!data.id.isEqual(this.type.id)) {
            return;
        }
        if (data.value !== null) {
            this.value = this.type.serializer.deserialize(data.value);
        }
        this.eventEmitter.emit(this.value);
    }

    private onTask(): void {
        if (this.listening) {
            this.client.send(REGISTRY_LISTEN_PACKET, this.type.id);
        }
        if (!this.type.id.isSubpathOf(this.client.app.id)) {
            return;
        }
        this.client.send(REGISTRY_REGISTER_PACKET, {
            id: this.type.id,
            permissions: this.type.permissions,
        });
    }
}

export const REGISTRY_EXTENSION_TYPE: ExtensionType<RegistryExtension> = new ExtensionType(
    'registry',
    (client: Client) => new RegistryExtension(client),
);
export const REGISTRY_PERMISSION_ID: Identifier = REGISTRY_EXTENSION_TYPE.join('permission');
const REGISTRY_REGISTER_PACKET = PacketType.createSerialized<RegistryRegisterPacket>(
    REGISTRY_EXTENSION_TYPE,
    {
        name: 'register',
        serializer: RegistryRegisterPacket,
    },
);
const REGISTRY_UPDATE_PACKET = PacketType.createSerialized<RegistryPacket>(
    REGISTRY_EXTENSION_TYPE,
    {
        name: 'update',
        serializer: RegistryPacket,
    },
);
const REGISTRY_LISTEN_PACKET = PacketType.createJson<Identifier>(REGISTRY_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Serializer.model(Identifier),
});
const REGISTRY_GET_ENDPOINT = EndpointType.createSerialized<Identifier, RegistryPacket>(
    REGISTRY_EXTENSION_TYPE,
    {
        name: 'get',
        requestSerializer: Serializer.model(Identifier).toJson(),
        responseSerializer: RegistryPacket,
        permissionId: REGISTRY_PERMISSION_ID,
    },
);
