import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { Identifier } from '../../identifier.js';

export enum LogType {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug',
}

export type LogMessage = {
    type: LogType;
    text: string;
};

export class LogPacket {
    constructor(
        public readonly id: Identifier,
        public readonly message: LogMessage,
    ) {}

    public static serialize(item: LogPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(item.id.key());
        writer.writeString(item.message.type);
        writer.writeString(item.message.text);
        return writer.finish();
    }

    public static deserialize(item: Uint8Array): LogPacket {
        const reader = ByteReader.fromUint8Array(item);
        const id = reader.readString();
        const type = reader.readString() as LogType;
        const text = reader.readString();
        const message = { type, text };
        return new LogPacket(Identifier.fromKey(id), message);
    }
}
