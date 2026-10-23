import type { ChatProvider, ProviderContext } from './provider';

export class ChatProviders {
    public static readonly PACKAGE_NAMES: readonly string[] = ['omu_chatprovider'];

    public static create(_context: ProviderContext): ChatProvider[] {
        return [];
    }
}
