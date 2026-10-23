import { PicartoProvider } from './picarto';
import type { ChatProvider, ProviderContext } from './provider';

export class ChatProviders {
    public static readonly PACKAGE_NAMES: readonly string[] = ['omu_chatprovider', 'omu_chat_picarto'];

    public static create(context: ProviderContext): ChatProvider[] {
        return [
            new PicartoProvider(context),
        ];
    }
}
