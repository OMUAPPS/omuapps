import { textDecoder, textEncoder } from './const.js';
import type { Model } from './model.js';

export interface Serializable<T, D> {
    serialize(data: T): D;
    deserialize(data: D): T;
}

export class Serializer<T, D> {
    constructor(
        public serialize: (data: T) => D,
        public deserialize: (data: D) => T,
    ) { }

    static of<T, D>(serializer: Serializable<T, D>): Serializer<T, D> {
        return new Serializer<T, D>(serializer.serialize, serializer.deserialize);
    }

    static noop<T>(): Serializer<T, T> {
        return new Serializer<T, T>(
            (data) => data,
            (data) => data,
        );
    }

    static model<M extends Model<D>, D>(model: { fromJson(data: D): M }): Serializer<M, D> {
        return new Serializer<M, D>((data) => data.toJson(), model.fromJson);
    }

    static json<T>(): Serializer<T, Uint8Array> {
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
                    return fallback
                }
            },
        )
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
        )
    }

    public pipe<E>(serializer: Serializable<D, E>): Serializer<T, E> {
        return new Serializer<T, E>(
            (data) => serializer.serialize(this.serialize(data)),
            (data) => this.deserialize(serializer.deserialize(data)),
        );
    }
    
    public static pipe<T, D, E>(serializer: Serializable<T, D>, next: Serializable<D, E>): Serializer<T, E> {
        return new Serializer<T, E>(
            (data) => next.serialize(serializer.serialize(data)),
            (data) => serializer.deserialize(next.deserialize(data)),
        );
    }
}
