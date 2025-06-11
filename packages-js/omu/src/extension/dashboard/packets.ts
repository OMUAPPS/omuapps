import { App, AppJson } from '../../app.js';
import { ByteReader, ByteWriter } from '../../bytebuffer.js';
import { PermissionType } from '../permission/permission.js';
import type { PackageInfo } from '../plugin/package-info.js';

export class PermissionRequestPacket {
    constructor(
        public readonly requestId: string,
        public readonly app: App,
        public readonly permissions: PermissionType[],
    ) { }

    public static serialize(packet: PermissionRequestPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.requestId);
        writer.writeString(JSON.stringify(packet.app.toJson()));
        writer.writeString(JSON.stringify(packet.permissions.map(permission => permission.toJson())));
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): PermissionRequestPacket {
        const reader = ByteReader.fromUint8Array(data);
        const requestId = reader.readString();
        const app = App.fromJson(JSON.parse(reader.readString()));
        const permissions = JSON.parse(reader.readString()).map(PermissionType.fromJson);
        return new PermissionRequestPacket(requestId, app, permissions);
    }
}

export class PluginRequestPacket {
    constructor(
        public readonly requestId: string,
        public readonly app: App,
        public readonly packages: PackageInfo[],
    ) { }

    public static serialize(packet: PluginRequestPacket): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.requestId);
        writer.writeString(JSON.stringify(packet.app.toJson()));
        writer.writeString(JSON.stringify(packet.packages));
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): PluginRequestPacket {
        const reader = ByteReader.fromUint8Array(data);
        const requestId = reader.readString();
        const app = App.fromJson(JSON.parse(reader.readString()));
        const packages = JSON.parse(reader.readString());
        return new PluginRequestPacket(requestId, app, packages);
    }
}

export class AppInstallRequest {
    constructor(public readonly requestId: string, public readonly app: App) { }

    public static serialize(packet: AppInstallRequest): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.requestId);
        writer.writeString(JSON.stringify(packet.app.toJson()));
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): AppInstallRequest {
        const reader = ByteReader.fromUint8Array(data);
        const requestId = reader.readString();
        const app = App.fromJson(JSON.parse(reader.readString()));
        return new AppInstallRequest(requestId, app);
    }
}

export class AppUpdateRequest {
    constructor(public readonly requestId: string, public readonly oldApp: App, public readonly newApp: App) { }
    
    public static serialize(packet: AppUpdateRequest): Uint8Array {
        const writer = new ByteWriter();
        writer.writeString(packet.requestId);
        writer.writeString(JSON.stringify(packet.oldApp.toJson()));
        writer.writeString(JSON.stringify(packet.newApp.toJson()));
        return writer.finish();
    }

    public static deserialize(data: Uint8Array): AppUpdateRequest {
        const reader = ByteReader.fromUint8Array(data);
        const requestId = reader.readString();
        const oldApp = App.fromJson(JSON.parse(reader.readString()));
        const newApp = App.fromJson(JSON.parse(reader.readString()));
        return new AppUpdateRequest(requestId, oldApp, newApp);
    }
}

export type AppInstallResponse = {
    accepted: boolean;
}

export type AppUpdateResponse = {
    accepted: boolean;
}

export type DragDropFile = {
    type: 'file' | 'directory';
    size: number;
    name: string;
}

export type DragDropPosition = {
    x: number;
    y: number;
}

export type DragEnter = {
    type: 'enter';
    drag_id: string;
    files: DragDropFile[];
    position: DragDropPosition;
}

export type DragOver = {
    type: 'over';
    drag_id: string;
    position: DragDropPosition;
}

export type DragDrop = {
    type: 'drop';
    drag_id: string;
    position: DragDropPosition;
    files: DragDropFile[];
}

export type DragLeave = {
    type: 'leave';
    drag_id: string;
}

export type DragState = DragEnter | DragOver | DragDrop | DragLeave

export type FileDragPacket = {
    drag_id: string;
    app: AppJson;
    state: DragState;
}

export type DragDropReadRequest = {
    drag_id: string;
}

export type DragDropReadRequestDashboard = {
    request_id: string;
    drag_id: string;
}

export type DragDropReadMeta = {
    request_id: string;
    drag_id: string;
    files: readonly DragDropFile[];
}

export class DragDropReadResponse {
    constructor(
        public readonly meta: DragDropReadMeta,
        public readonly files: readonly Uint8Array[],
        public readonly version: number = 1,
    ) {}

    public static serialize(data: DragDropReadResponse): Uint8Array {
        const writer = new ByteWriter();
        writer.writeULEB128(data.version);
        writer.writeString(JSON.stringify(data.meta));
        writer.writeULEB128(data.files.length);
        
        for (const file of data.files) {
            writer.writeUint8Array(file);
        }

        return writer.finish();
    }

    public static deserialize(data: Uint8Array): DragDropReadResponse {
        const reader = ByteReader.fromUint8Array(data);
        const version = reader.readULEB128();
        const meta: DragDropReadMeta = JSON.parse(reader.readString());
        const length = reader.readULEB128();

        const files: Uint8Array[] = [];
        for (let i = 0; i < length; i++) {
            files.push(reader.readUint8Array());
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
}

export type DragDropRequestResponse = {
    request_id: string;
    ok: boolean;
}
