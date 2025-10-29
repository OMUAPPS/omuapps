import { textDecoder, textEncoder } from '../const';
import { ByteReader, ByteWriter } from '../serialize';
import { Packet, PacketData } from './packet';
import { PACKET_TYPES } from './packet/packet-types';

function base64UrlEncode(buffer: Uint8Array): string {
    return buffer
        .toBase64()
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(data: string): Uint8Array {
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    while (data.length % 4) {
        data += '=';
    }
    return Uint8Array.fromBase64(data);
}

function convertUint8ArrayToArrayBuffer(u8: Uint8Array): ArrayBuffer {
    const buf = new ArrayBuffer(u8.length);
    const view = new Uint8Array(buf);
    view.set(u8);
    return buf;
}

type RSANumbers = {
    e: string;
    n: string;
};

export type EncryptionResponse = {
    kind: 'v1';
    rsa: RSANumbers;
    aes: string;
};

export const ENCRYPTION_AVAILABLE: boolean = typeof crypto !== 'undefined' && !!crypto.subtle;

export class Decryptor {
    private constructor(
        private readonly privateKey: CryptoKey,
        private readonly publicKey: CryptoKey,
    ) {}

    public static async new(): Promise<Decryptor> {
        const { privateKey, publicKey } = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['encrypt', 'decrypt'],
        );

        return new Decryptor(privateKey, publicKey);
    }

    public async toRequest(): Promise<RSANumbers> {
        const key = await crypto.subtle.exportKey('jwk', this.publicKey);
        if (!key.e) throw new Error('Key export failed: missing exponent');
        if (!key.n) throw new Error('Key export failed: missing modulus');
        return {
            e: key.e,
            n: key.n,
        };
    }

    public async decrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            this.privateKey,
            data,
        );
        return decrypted;
    }

    public async decryptString(data: string): Promise<string> {
        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            this.privateKey,
            convertUint8ArrayToArrayBuffer(base64UrlDecode(data)),
        );
        return textDecoder.decode(decrypted);
    }
}

export class Encryptor {
    private constructor(
        private readonly publicKey: CryptoKey,
    ) {}

    public static async new(request: RSANumbers): Promise<Encryptor> {
        const publicKey = await crypto.subtle.importKey(
            'jwk',
            {
                alg: 'RSA-OAEP-256',
                ext: true,
                key_ops: ['encrypt'],
                kty: 'RSA',
                e: request.e.replace(/=+$/, ''),
                n: request.n.replace(/=+$/, ''),
            },
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['encrypt'],
        );
        return new Encryptor(publicKey);
    }

    public async encrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
        return await crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP',
            },
            this.publicKey,
            data,
        );
    }

    public async encryptString(data: string): Promise<string> {
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP',
            },
            this.publicKey,
            textEncoder.encode(data),
        );
        return base64UrlEncode(new Uint8Array(encrypted));
    }
}

export class AES {
    private constructor(
        private readonly key: CryptoKey,
        private readonly iv: ArrayBuffer,
    ) {}

    public static async new(): Promise<AES> {
        const key = await crypto.subtle.generateKey(
            {
                name: 'AES-CBC',
                length: 128,
            },
            true,
            ['encrypt', 'decrypt'],
        );
        const iv = crypto.getRandomValues(new Uint8Array(16));
        return new AES(key, iv.buffer);
    }

    public static async deserialize(aes: string, decryptor: Decryptor): Promise<AES> {
        const decrypted = await decryptor.decrypt(convertUint8ArrayToArrayBuffer(base64UrlDecode(aes)));
        const reader = ByteReader.fromArrayBuffer(decrypted);
        const key = reader.readUint8Array();
        const iv = reader.readUint8Array();

        const key_encoded = await crypto.subtle.importKey(
            'raw',
            convertUint8ArrayToArrayBuffer(key),
            'AES-CBC',
            false,
            ['encrypt', 'decrypt'],
        );
        return new AES(
            key_encoded,
            convertUint8ArrayToArrayBuffer(iv),
        );
    }

    public async serialize(encryptor: Encryptor): Promise<string> {
        const writer = new ByteWriter();
        const rawKey = await crypto.subtle.exportKey('raw', this.key);
        writer.writeUint8Array(new Uint8Array(rawKey));
        writer.writeUint8Array(new Uint8Array(this.iv));
        const encrypted = await encryptor.encrypt(convertUint8ArrayToArrayBuffer(writer.finish()));
        return base64UrlEncode(new Uint8Array(encrypted));
    }

    public async encrypt(data: PacketData): Promise<Packet> {
        const writer = new ByteWriter();
        writer.writeString(data.type);
        writer.writeUint8Array(data.data);
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-CBC',
                iv: this.iv,
                length: 16,
            },
            this.key,
            convertUint8ArrayToArrayBuffer(writer.finish()),
        );
        return PACKET_TYPES.ENCRYPTED_PACKET.new(new Uint8Array(encrypted));
    }

    public async decrypt(packet: Packet<Uint8Array>): Promise<PacketData> {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-CBC',
                iv: this.iv,
                length: 16,
            },
            this.key,
            convertUint8ArrayToArrayBuffer(packet.data),
        );
        const reader = ByteReader.fromArrayBuffer(decrypted);
        const type = reader.readString();
        const data = reader.readUint8Array();
        return {
            type,
            data,
        };
    }
}
