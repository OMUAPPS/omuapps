import { ChatHost } from '@omujs/chat-provider';
import type { Omu } from '@omujs/omu';

import type { ServerPlugin, ServerPluginContext } from '../../api';

import { ChatPermissions } from './chat-permissions.js';

export class ChatPlugin implements ServerPlugin {
    public readonly packageNames: readonly string[] = ['omu_chat'];
    private client: Omu | undefined;

    public constructor(private readonly context: ServerPluginContext) {
        context.security.registerPermission(...ChatPermissions.ALL);
    }

    public async start(): Promise<void> {
        const omu = this.context.createClient(ChatHost.APP);
        new ChatHost(omu);
        this.client = omu;
        void omu.start();
    }

    public async stop(): Promise<void> {
        this.client?.stop();
        this.client = undefined;
    }

    public async uninstall(): Promise<void> {}
}
