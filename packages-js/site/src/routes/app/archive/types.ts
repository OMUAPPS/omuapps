import { EndpointType } from '@omujs/omu/api/endpoint';
import { RegistryType } from '@omujs/omu/api/registry';
import { TableType } from '@omujs/omu/api/table';
import { APP_ID } from './app.js';
import { Archive, type ArchiveConfig } from './archive.js';

export const PLUGIN_ID = APP_ID.join('plugin');
export const ARCHIVE_TABLE = TableType.createJson<Archive>(PLUGIN_ID, {
    key: (item) => item.key(),
    name: 'archive',
});
export const CONFIG_REGISTRY = RegistryType.createJson<ArchiveConfig>(PLUGIN_ID, {
    name: 'config',
    defaultValue: {
        active: false,
        archive_limit: {
            count: 0,
            duration_days: 0,
            size_mb: 0,
        },
        output_dir: '',
        yt_dlp_info: {
            channel: '',
            git_head: '',
            origin: '',
            update_hint: '',
            variant: '',
            version: '',
        },
        yt_dlp_options: {},
    },
});
export const OPEN_OUTPUT_DIR_ENDPOINT_TYPE = EndpointType.createJson<null, null>(PLUGIN_ID, {
    name: 'open_output_dir',
});
