import { App } from '../../app';
import { PacketType } from '../../network/packet';
import { Omu } from '../../omu';
import { ByteReader, ByteWriter, Serializer } from '../../serialize';
import { EndpointType } from '../endpoint';
import { DASHBOARD_DRAG_DROP_PERMISSION_ID, DASHBOARD_EXTENSION_TYPE } from './constants';
import { DashboardHandler } from './handler';

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

export type DragDropReadMeta = {
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

export type DragDropRequestDashboard = object;

export type DragDropRequestResponse = {
    ok: boolean;
};

export type DragDropHandler = {
    onEnter(fn: (event: DragEnter) => unknown): void;
    onOver(fn: (event: DragOver) => unknown): void;
    onDrop(fn: (event: DragDrop) => unknown): void;
    onLeave(fn: (event: DragLeave) => unknown): void;
    read(id: string): Promise<DragDropReadResponse>;
};

const DASHBOARD_DRAG_DROP_READ_ENDPOINT = EndpointType.createSerialized<DragDropReadRequest, DragDropReadResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_read',
    requestSerializer: Serializer.json(),
    responseSerializer: DragDropReadResponse,
    permissionId: DASHBOARD_DRAG_DROP_PERMISSION_ID,
});
const DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT = EndpointType.createJson<DragDropRequestDashboard, DragDropRequestResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_request',
    permissionId: DASHBOARD_DRAG_DROP_PERMISSION_ID,
});
const DASHBOARD_DRAG_DROP_STATE_PACKET = PacketType.createJson<FileDragPacket>(DASHBOARD_EXTENSION_TYPE, {
    name: 'drag_drop_state',
    serializer: Serializer.noop<FileDragPacket>()
        .field('app', App),
});

export class DragDropAPI {
    private dragDropHandler: DragDropHandler | null = null;
    private dragDropListeners = {
        enter: [] as Array<(state: DragEnter) => unknown>,
        over: [] as Array<(state: DragOver) => unknown>,
        drop: [] as Array<(state: DragDrop) => unknown>,
        leave: [] as Array<(state: DragLeave) => unknown>,
    };

    constructor(
        private readonly omu: Omu,
    ) {
        omu.network.registerPacket(
            DASHBOARD_DRAG_DROP_STATE_PACKET,
        );
        omu.network.addPacketHandler(DASHBOARD_DRAG_DROP_STATE_PACKET, ({ state }) => {
            switch (state.type) {
                case 'enter': {
                    this.dragDropListeners.enter.forEach((fn) => fn(state));
                    break;
                }
                case 'over': {
                    this.dragDropListeners.over.forEach((fn) => fn(state));
                    break;
                }
                case 'drop': {
                    this.dragDropListeners.drop.forEach((fn) => fn(state));
                    break;
                }
                case 'leave': {
                    this.dragDropListeners.leave.forEach((fn) => fn(state));
                    break;
                }
            }
        });
    }

    public async requestDragDrop(): Promise<DragDropHandler> {
        await this.omu.endpoints.call(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, {});
        const listeners = this.dragDropListeners;
        const client = this.omu;
        this.dragDropHandler = {
            onEnter(fn) { listeners.enter.push(fn); },
            onOver(fn) { listeners.over.push(fn); },
            onDrop(fn) { listeners.drop.push(fn); },
            onLeave(fn) { listeners.leave.push(fn); },
            async read(id) { return await client.endpoints.call(DASHBOARD_DRAG_DROP_READ_ENDPOINT, { drag_id: id }); },
        };
        return this.dragDropHandler;
    }

    public async setDashboard(dashboard: DashboardHandler): Promise<void> {
        this.omu.endpoints.bind(DASHBOARD_DRAG_DROP_REQUEST_ENDPOINT, async (request: DragDropRequestDashboard, params): Promise<DragDropRequestResponse> => {
            const accepted = await dashboard.handleDragDropRequest(request, params);
            return {
                ok: accepted,
            };
        });
        this.omu.endpoints.bind(DASHBOARD_DRAG_DROP_READ_ENDPOINT, async (request, params): Promise<DragDropReadResponse> => {
            const response = await dashboard.handleDragDropReadRequest(request, params);
            return response;
        });
    }

    public async notifyDropDragState(packet: FileDragPacket): Promise<void> {
        return this.omu.send(DASHBOARD_DRAG_DROP_STATE_PACKET, packet);
    }
}
