import type { Unlisten } from '../../event';
import { EventEmitter } from '../../event';
import { Identifier, IdentifierMap } from '../../identifier';
import { Lock } from '../../lock.js';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { JsonType, Serializer } from '../../serialize';
import { EndpointType } from '../endpoint/endpoint.js';
import { type Extension, ExtensionType } from '../extension.js';

import { RegisterPacket, RegistryPacket } from './packets.js';
import { type Registry, RegistryType, Writable } from './registry.js';

export class RegistryExtension implements Extension {
    public readonly type: ExtensionType<RegistryExtension> = REGISTRY_EXTENSION_TYPE;
    private readonly registries = new IdentifierMap<Registry<unknown>>();

    constructor(private readonly omu: Omu) {
        omu.network.registerPacket(
            REGISTRY_REGISTER_PACKET,
            REGISTRY_UPDATE_PACKET,
            REGISTRY_LISTEN_PACKET,
        );
    }

    private createRegistry<T>(registryType: RegistryType<T>): Registry<T> {
        if (this.registries.has(registryType.id)) {
            throw new Error(`Registry with identifier '${registryType.id}' already exists`);
        }
        return new RegistryImpl(this.omu, registryType);
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

    public json<T, D extends JsonType = T extends JsonType ? T : JsonType>(name: string, options: { default: T; serializer?: Serializer<T, D> }): Registry<T> {
        const tableType = RegistryType.createJson<T>(this.omu.app.id.base, {
            name,
            defaultValue: options.default,
            serializer: options.serializer,
        });
        if (this.registries.has(tableType.id)) {
            throw new Error(`Registry with name '${name}' already exists`);
        }
        return this.createRegistry(tableType);
    }

    public serialized<T>(name: string, options: { default: T; serializer: Serializer<T, Uint8Array> }): Registry<T> {
        const tableType = RegistryType.createSerialized<T>(this.omu.app.id.base, {
            name,
            defaultValue: options.default,
            serializer: options.serializer,
        });
        if (this.registries.has(tableType.id)) {
            throw new Error(`Registry with name '${name}' already exists`);
        }
        return this.createRegistry(tableType);
    }
}

class RegistryImpl<T> implements Registry<T> {
    private readonly eventEmitter: EventEmitter<[T]> = new EventEmitter();
    private readonly lock: Lock = new Lock();
    private listening = false;
    public value: T;

    constructor(
        private readonly omu: Omu,
        public readonly type: RegistryType<T>,
    ) {
        this.value = type.defaultValue;
        omu.network.addPacketHandler(REGISTRY_UPDATE_PACKET, (packet) =>
            this.handleUpdate(packet),
        );
        omu.network.addTask(() => this.onTask());
        if (omu.running) {
            this.onTask();
        }
    }

    async #get(): Promise<T> {
        const result = await this.omu.endpoints.call(REGISTRY_GET_ENDPOINT, this.type.id);
        if (result.value === null) {
            return this.type.defaultValue;
        }
        return this.type.serializer.deserialize(result.value);
    }

    async #set(value: T): Promise<void> {
        this.omu.send(REGISTRY_UPDATE_PACKET, {
            id: this.type.id,
            value: this.type.serializer.serialize(value),
        });
    }

    public async get(): Promise<T> {
        const value = await this.lock.use(async () => this.#get());
        this.eventEmitter.emit(value);
        return value;
    }

    public async set(value: T): Promise<void> {
        await this.lock.use(async () => this.#set(value));
        this.eventEmitter.emit(value);
    }

    public async update(fn: (value: T) => PromiseLike<T> | T): Promise<T> {
        const value = await this.lock.use(async () => {
            const value = await this.#get();
            const newValue = await fn(value);
            await this.#set(newValue);
            return newValue;
        });
        this.eventEmitter.emit(value);
        return value;
    }

    public async modify(fn: (value: T) => PromiseLike<void> | void): Promise<T> {
        const value = await this.lock.use(async () => {
            const value = await this.#get();
            await fn(value);
            await this.#set(value);
            return value;
        });
        this.eventEmitter.emit(value);
        return value;
    }

    public listen(handler: (value: T) => Promise<void> | void): Unlisten {
        if (!this.listening && this.omu.ready) {
            this.omu.send(REGISTRY_LISTEN_PACKET, this.type.id);
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
            this.omu.send(REGISTRY_LISTEN_PACKET, this.type.id);
        }
        if (!this.type.id.isSubpathOf(this.omu.app.id)) {
            return;
        }
        this.omu.send(REGISTRY_REGISTER_PACKET, {
            id: this.type.id,
            permissions: this.type.permissions,
        });
    }

    public compatSvelte(): Writable<T> {
        let isReady = false;
        const context = {
            changed: false,
            markChanged: () => {
                context.changed = true;
                this.#set(this.value);
                handle(this.value);
            },
        };
        const listeners = new Set<(value: T) => void>();

        const handle = (newValue: T) => {
            isReady = true;
            emit(newValue);
        };

        const unsubscribe = this.listen(handle);

        const emit = (value: T) => {
            this.value = value;
            const proxied = proxy(value, context);
            listeners.forEach(listener => listener(proxied));
        };

        return {
            set: (value: T) => {
                if (!isReady) {
                    throw new Error(`Registry ${this.type.id.key()} is not ready`);
                }
                const proxied = value?.[PROXIED_SYMBOL];
                if (proxied && !context.changed) return;
                this.#set(value);
                emit(value);
                context.changed = false;
            },
            subscribe: (run: (value: T) => void) => {
                listeners.add(run);
                run(proxy(this.value, context));

                return () => {
                    listeners.delete(run);
                    if (listeners.size === 0) {
                        unsubscribe?.();
                    }
                };
            },
            update: (fn: (value: T) => T) => {
                if (!isReady) {
                    throw new Error(`Registry ${this.type.id.key()} is not ready`);
                }
                this.update(fn);
            },
            wait: (): Promise<T> => {
                return isReady
                    ? Promise.resolve(this.value)
                    : new Promise(resolve => {
                        const unsubscribe = this.listen((value: T) => {
                            unsubscribe?.();
                            resolve(value);
                        });
                    });
            },
        };
    }
}

const PROXIED_SYMBOL = Symbol('ProxiedRegistry');

function deepEqual(objA, objB) {
    if (objA === objB) return true; // Check for referential equality and primitive values

    if (
        typeof objA !== 'object' ||
        typeof objB !== 'object' ||
        objA === null ||
        objB === null
    ) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false; // Different number of properties

    for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(objA[key], objB[key])) {
            return false; // Property missing or values are not deeply equal
        }
    }

    return true; // All properties and their values are deeply equal
}

type ProxyContext = {
    changed: boolean;
    markChanged: () => void;
};

function proxy<T>(
    value: T,
    context: ProxyContext,
) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    if (PROXIED_SYMBOL in value) {
        return value;
    }
    let changed = false;
    return new Proxy(value, {
        set(target, prop, value) {
            changed = !deepEqual(target[prop], value);
            if (!changed) return true;
            target[prop] = value;
            context.markChanged();
            return true;
        },
        get(target, prop) {
            if (prop === PROXIED_SYMBOL) {
                return value;
            }
            return proxy(target[prop], context);
        },
        has(target, p) {
            if (p === PROXIED_SYMBOL) return true;
            return p in target;
        },
        deleteProperty(target, prop) {
            if (!(prop in target)) return false;
            delete target[prop];
            context.markChanged();
            return true;
        },
    });
}

export const REGISTRY_EXTENSION_TYPE: ExtensionType<RegistryExtension> = new ExtensionType(
    'registry',
    (omu: Omu) => new RegistryExtension(omu),
);
export const REGISTRY_PERMISSION_ID: Identifier = REGISTRY_EXTENSION_TYPE.join('permission');
const REGISTRY_REGISTER_PACKET = PacketType.createJson<RegisterPacket>(REGISTRY_EXTENSION_TYPE, {
    name: 'register',
    serializer: RegisterPacket,
});
const REGISTRY_UPDATE_PACKET = PacketType.createSerialized<RegistryPacket>(
    REGISTRY_EXTENSION_TYPE,
    {
        name: 'update',
        serializer: RegistryPacket,
    },
);
const REGISTRY_LISTEN_PACKET = PacketType.createJson<Identifier>(REGISTRY_EXTENSION_TYPE, {
    name: 'listen',
    serializer: Identifier,
});
const REGISTRY_GET_ENDPOINT = EndpointType.createSerialized<Identifier, RegistryPacket>(
    REGISTRY_EXTENSION_TYPE,
    {
        name: 'get',
        requestSerializer: Serializer.of(Identifier).toJson(),
        responseSerializer: RegistryPacket,
        permissionId: REGISTRY_PERMISSION_ID,
    },
);
