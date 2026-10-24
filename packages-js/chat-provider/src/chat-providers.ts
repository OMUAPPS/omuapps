import { PicartoProvider } from './picarto';
import type { ChatProvider, ProviderContext } from './provider';
import { TwitchProvider } from './twitch';
import { YoutubeProvider } from './youtube';

export class ChatProviders {
    public static readonly PACKAGE_NAMES: readonly string[] = ['omu_chatprovider', 'omu_chat_youtube', 'omu_chat_twitch', 'omu_chat_picarto'];

    public static create(context: ProviderContext): ChatProvider[] {
        return [
            new YoutubeProvider(context),
            new TwitchProvider(context),
            new PicartoProvider(context),
        ];
    }
}
