import type { ServerPlugin, ServerPluginContext } from '../api';

import { ChatPlugin, ChatProviderPlugin } from './chat';
import { ObsInstallations, ObsPlugin } from './obs';

export class BundledPlugins {
    public static create(context: ServerPluginContext): ServerPlugin[] {
        return [
            new ChatPlugin(context),
            new ChatProviderPlugin(context),
            new ObsPlugin(context, ObsInstallations.current),
        ];
    }
}
