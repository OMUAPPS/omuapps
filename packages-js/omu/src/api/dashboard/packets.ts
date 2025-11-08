import { App, AppJson } from '../../app.js';
import { ByteReader, ByteWriter } from '../../serialize';

export type AppInstallResponse = {
    accepted: boolean;
};

export type DragDropFile = {
    type: 'file' | 'directory';
    size: number;
    name: string;
};

export type DragDropPosition = {
    x: number;
    y: number;
};

export type DragEnter = {
    type: 'enter';
    drag_id: string;
    files: DragDropFile[];
    position: DragDropPosition;
};

export type DragOver = {
    type: 'over';
    drag_id: string;
    position: DragDropPosition;
};

export type DragDrop = {
    type: 'drop';
    drag_id: string;
    position: DragDropPosition;
    files: DragDropFile[];
};

export type DragLeave = {
    type: 'leave';
    drag_id: string;
};

export type DragState = DragEnter | DragOver | DragDrop | DragLeave;

export type FileDragPacket = {
    drag_id: string;
    app: App;
    state: DragState;
};

export type DragDropReadRequest = {
    drag_id: string;
};

export type DragDropReadRequestDashboard = {
    request_id: string;
    drag_id: string;
};

export type DragDropReadMeta = {
    request_id: string;
    drag_id: string;
    files: readonly DragDropFile[];
};

export type FileData = {
    file: DragDropFile;
    buffer: Uint8Array;
};

export class DragDropReadResponse {
    constructor(
        public readonly meta: DragDropReadMeta,
        public readonly files: Record<string, FileData>,
        public readonly version: number = 1,
    ) {}

    public static serialize(data: DragDropReadResponse): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(data.version);
        writer.writeString(JSON.stringify(data.meta));
        writer.writeULEB128(Object.keys(data.files).length);

        for (const [key, { file, buffer }] of Object.entries(data.files)) {
            writer.writeString(key);
            writer.writeString(JSON.stringify(file));
            writer.writeUint8Array(buffer);
        }

        return writer.finish();
    }

    public static deserialize(data: Uint8Array): DragDropReadResponse {
        const reader = ByteReader.fromUint8Array(data);
        const version = reader.readULEB128();
        const meta: DragDropReadMeta = JSON.parse(reader.readString());
        const length = reader.readULEB128();

        const files: Record<string, FileData> = {};
        for (let i = 0; i < length; i++) {
            const key = reader.readString();
            const file: DragDropFile = JSON.parse(reader.readString());
            const buffer = reader.readUint8Array();
            files[key] = { file, buffer };
        }

        return new DragDropReadResponse(
            meta,
            files,
            version,
        );
    }
}

export type DragDropRequest = object;

export type DragDropRequestDashboard = {
    request_id: string;
    app: AppJson;
};

export type DragDropRequestResponse = {
    request_id: string;
    ok: boolean;
};
