import { textDecoder, textEncoder } from '../const.js';

export type JsonType = string | number | boolean | null | undefined | { [key in never]?: JsonType } | JsonType[];

export interface Serializable<T, D> {
    serialize(data: T): D;
    deserialize(data: D): T;
}

export class Serializer<T, D> {
    constructor(
        public serialize: (data: T) => D,
        public deserialize: (data: D) => T,
    ) { }

    public static of<T, D>(serializer: Serializable<T, D>): Serializer<T, D> {
        return new Serializer<T, D>(serializer.serialize, serializer.deserialize);
    }

    public static pipe<T, R, D>(ser1: Serializable<T, R>, ser2: Serializable<R, D>): Serializable<T, D> {
        return new Serializer<T, D>(
            (data) => ser2.serialize(ser1.serialize(data)),
            (data) => ser1.deserialize(ser2.deserialize(data)),
        );
    }

    public static transform<T>(func: (value: T) => T): Serializer<T, T> {
        return new Serializer<T, T>(
            func,
            func,
        );
    }

    public static noop<T>(): Serializer<T, T> {
        return new Serializer<T, T>(
            (data) => data,
            (data) => data,
        );
    }

    public field<
        K extends keyof D,
        R,
    >(
        key: K,
        serializer: Serializable<D[K], R>,
    ): Serializer<
        T,
        { [P in keyof D]: P extends K ? R : D[P] }
    > {
        return new Serializer<
            T,
            { [P in keyof D]: P extends K ? R : D[P] }
        >(
            (data) => {
                const serialized = this.serialize(data);
                return {
                    ...serialized,
                    [key]: serializer.serialize(serialized[key]),
                } as { [P in keyof D]: P extends K ? R : D[P] };
            },
            (data) => {
                return this.deserialize({
                    ...data,
                    [key]: serializer.deserialize(data[key] as R),
                } as D);
            },
        );
    }

    static json<T extends JsonType>(): Serializer<T, Uint8Array> {
        return new Serializer<T, Uint8Array>(
            (data) => textEncoder.encode(JSON.stringify(data)),
            (data) => {
                const text = textDecoder.decode(data);
                return JSON.parse(text);
            },
        );
    }

    public toJson(): Serializer<T, Uint8Array> {
        return new Serializer<T, Uint8Array>(
            (data) => textEncoder.encode(JSON.stringify(this.serialize(data))),
            (data) => {
                const text = textDecoder.decode(data);
                return this.deserialize(JSON.parse(text));
            },
        );
    }

    public toArray(): Serializer<T[], D[]> {
        return new Serializer<T[], D[]>(
            (data) => data.map((item) => this.serialize(item)),
            (data) => data.map((item) => this.deserialize(item)),
        );
    }

    public toMap(): Serializer<Map<string, T>, Map<string, D>> {
        return new Serializer<Map<string, T>, Map<string, D>>(
            (data) => {
                const result = new Map<string, D>();
                data.forEach((value, key) => {
                    result.set(key, this.serialize(value));
                });
                return result;
            },
            (data) => {
                const result = new Map<string, T>();
                data.forEach((value, key) => {
                    result.set(key, this.deserialize(value));
                });
                return result;
            },
        );
    }

    public fallback(fallback: T): Serializer<T, D> {
        return new Serializer<T, D>(
            (data) => this.serialize(data),
            (data) => {
                try {
                    return this.deserialize(data);
                } catch {
                    return fallback;
                }
            },
        );
    }

    public fallbackMap(fallback: (data: D, error: unknown) => T): Serializer<T, D> {
        return new Serializer<T, D>(
            (data) => this.serialize(data),
            (data) => {
                try {
                    return this.deserialize(data);
                } catch (error) {
                    return fallback(data, error);
                }
            },
        );
    }

    public pipe<E>(serializer: Serializable<D, E>): Serializer<T, E> {
        return new Serializer<T, E>(
            (data) => serializer.serialize(this.serialize(data)),
            (data) => this.deserialize(serializer.deserialize(data)),
        );
    }
}
