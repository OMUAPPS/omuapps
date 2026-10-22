import type { ServerPlugin, ServerPluginContext } from '../api';

import { ObsInstallations, ObsPlugin } from './obs';

export class BundledPlugins {
    public static create(context: ServerPluginContext): ServerPlugin[] {
        return [
            new ObsPlugin(context, ObsInstallations.current),
        ];
    }
}
