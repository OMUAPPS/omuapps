import { ChatProviders, ChatProviderService } from '@omujs/chat-provider';
import type { Omu } from '@omujs/omu';

import type { ServerPlugin, ServerPluginContext } from '../../api';

export class ChatProviderPlugin implements ServerPlugin {
    public readonly packageNames: readonly string[] = ChatProviders.PACKAGE_NAMES;
    private client: Omu | undefined;
    private service: ChatProviderService | undefined;

    public constructor(private readonly context: ServerPluginContext) {}

    public async start(): Promise<void> {
        const omu = this.context.createClient(ChatProviderService.APP);
        this.service = new ChatProviderService(omu, (context) => ChatProviders.create(context));
        this.client = omu;
        void omu.start();
    }

    public async stop(): Promise<void> {
        this.service?.stop();
        this.client?.stop();
        this.service = undefined;
        this.client = undefined;
    }

    public async uninstall(): Promise<void> {}
}
