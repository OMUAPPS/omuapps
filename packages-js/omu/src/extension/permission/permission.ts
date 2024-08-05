import { Identifier } from '../../identifier.js';
import type { LocalizedText } from '../../localization/localization.js';
import type { Model } from '../../model.js';

type PermissionLevel = 'low' | 'medium' | 'high';

export type PermissionMetadata = {
    name: LocalizedText;
    note?: LocalizedText;
    level: PermissionLevel;
};

export type PermissionTypeJson = {
    id: string;
    metadata: PermissionMetadata;
};

export class PermissionType implements Model<PermissionTypeJson> {
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

    public toJson(): PermissionTypeJson {
        return {
            id: this.id.key(),
            metadata: this.metadata,
        };
    }

    public static fromJson(json: PermissionTypeJson): PermissionType {
        return new PermissionType({
            id: Identifier.fromKey(json.id),
            metadata: json.metadata,
        });
    }
}
