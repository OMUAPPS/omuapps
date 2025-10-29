import { DisconnectType } from './network/packet/packet-types.js';
export class OmuError extends Error {
    constructor(message: string | null) {
        super(message ?? undefined);
        this.name = this.constructor.name;
    }
}

export class DisconnectReason extends OmuError {
    constructor(
        public type: DisconnectType,
        public message = '',
    ) {
        super(message);
    }
}

export class ServerRestart extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.SERVER_RESTART, message);
    }
}

export class AnotherConnection extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.ANOTHER_CONNECTION, message);
    }
}

export class PermissionDenied extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.PERMISSION_DENIED, message);
    }
}

export class InvalidToken extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.INVALID_TOKEN, message);
    }
}

export class InvalidOrigin extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.INVALID_ORIGIN, message);
    }
}

export class InvalidVersion extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.INVALID_VERSION, message);
    }
}

export class InvalidPacket extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.INVALID_PACKET, message);
    }
}

export class InternalError extends DisconnectReason {
    constructor(message: string) {
        super(DisconnectType.INTERNAL_ERROR, message);
    }
}
