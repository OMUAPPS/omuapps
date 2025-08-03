import { Identifier } from '../../identifier.js';
import type { LocalizedText } from '../../localization/localization.js';

export type PermissionLevel = 'low' | 'medium' | 'high';

export type PermissionMetadata = {
    name: LocalizedText;
    note?: LocalizedText;
    level: PermissionLevel;
};

export type PermissionTypeJson = {
    id: string;
    metadata: PermissionMetadata;
};

export class PermissionType {
    public readonly id: Identifier;
    public readonly metadata: PermissionMetadata;

    constructor(options: { id: Identifier; metadata: PermissionMetadata }) {
        this.id = options.id;
        this.metadata = options.metadata;
    }

    public static create(
        identifier: Identifier,
        {
            name,
            metadata,
        }: {
            name: string;
            metadata: PermissionMetadata;
        },
    ): PermissionType {
        return new PermissionType({
            id: identifier.join(name),
            metadata: metadata,
        });
    }

    public static serialize(data: PermissionType): PermissionTypeJson {
        return {
            id: data.id.key(),
            metadata: data.metadata,
        };
    }

    public static deserialize(json: PermissionTypeJson): PermissionType {
        return new PermissionType({
            id: Identifier.fromKey(json.id),
            metadata: json.metadata,
        });
    }
}
