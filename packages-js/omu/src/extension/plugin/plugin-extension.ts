import type { Client } from '../../client.js';
import { PacketType } from '../../network/packet/packet.js';
import { ExtensionType } from '../extension.js';

export const PLUGIN_EXTENSION_TYPE = new ExtensionType(
    'plugin',
    (client: Client) => new PluginExtension(client),
);

export class PluginExtension {
    public readonly type = PLUGIN_EXTENSION_TYPE;
    private readonly requiredPlugins: Map<string, string | null> = new Map();

    constructor(private readonly client: Client) {
        client.network.registerPacket(PLUGIN_REQUIRE_PACKET);
        client.network.addTask(() => this.onTask());
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
