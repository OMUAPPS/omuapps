import type { Client } from '../../client.js';
import { Identifier } from '../../identifier.js';
import { PacketType } from '../../network/packet/packet.js';
import { EndpointType } from '../endpoint/endpoint.js';
import { ExtensionType } from '../extension.js';
import { Table, TableType } from '../table/table.js';

export const PLUGIN_EXTENSION_TYPE: ExtensionType<PluginExtension> = new ExtensionType(
    'plugin',
    (client: Client) => new PluginExtension(client),
);

export class PluginExtension {
    public readonly type: ExtensionType<PluginExtension> = PLUGIN_EXTENSION_TYPE;
    private readonly requiredPlugins: Map<string, string | null> = new Map();

    constructor(private readonly client: Client) {
        client.network.registerPacket(PLUGIN_REQUIRE_PACKET);
        client.network.addTask(() => this.onTask());
    }

    public getAllowedPackages(): Table<PluginPackageInfo> {
        return this.client.tables.get(PLUGIN_ALLOWED_PACKAGE_TABLE);
    }

    public reload(options: ReloadOptions): void {
        this.client.endpoints.call(PLUGIN_RELOAD_ENDPOINT_TYPE, options);
    }

    private async onTask(): Promise<void> {
        this.client.send(PLUGIN_REQUIRE_PACKET, Object.fromEntries(this.requiredPlugins));
    }

    public require(plugins: Record<string, string | null>): void {
        if (this.client.running) {
            throw new Error('Plugins must be required before the client starts');
        }
        for (const [key, value] of Object.entries(plugins)) {
            this.requiredPlugins.set(key, value);
        }
    }
}

const PLUGIN_REQUIRE_PACKET = PacketType.createJson<Record<string, string | null>>(
    PLUGIN_EXTENSION_TYPE,
    {
        name: 'require',
    },
);
export class PluginPackageInfo {
    public package: string;
    public version: string;

    constructor(_package: string, version: string) {
        this.package = _package;
        this.version = version;
    }

    public static serialize(data: PluginPackageInfo): { package: string, version: string } {
        return data.toJson();
    }

    public static deserialize(data: { package: string, version: string }): PluginPackageInfo {
        return PluginPackageInfo.fromJson(data);
    }

    public static fromJson(json: { package: string, version: string }): PluginPackageInfo {
        return new PluginPackageInfo(json.package, json.version);
    }

    public toJson(): { package: string, version: string } {
        return { package: this.package, version: this.version };
    }

    public key(): string {
        return this.package;
    }
}

export const PLUGIN_READ_PACKAGE_PERMISSION_ID: Identifier = PLUGIN_EXTENSION_TYPE.join('package', 'read')
export const PLUGIN_MANAGE_PACKAGE_PERMISSION_ID: Identifier = PLUGIN_EXTENSION_TYPE.join('package', 'manage')

const PLUGIN_ALLOWED_PACKAGE_TABLE = TableType.createJson(PLUGIN_EXTENSION_TYPE, {
    name: 'allowed_package',
    serializer: PluginPackageInfo,
    key: (item) => item.key(),
});

type ReloadOptions = {
    packages: string[] | null,
};

type ReloadResult = {
    packages: Record<string, string>,
};

const PLUGIN_RELOAD_ENDPOINT_TYPE = EndpointType.createJson<ReloadOptions, ReloadResult>(PLUGIN_EXTENSION_TYPE, {
    name: 'reload',
    permissionId: PLUGIN_MANAGE_PACKAGE_PERMISSION_ID,
});
