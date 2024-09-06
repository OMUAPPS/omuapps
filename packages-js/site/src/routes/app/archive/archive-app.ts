import { makeRegistryWritable } from '$lib/helper.js';
import type { Omu } from '@omujs/omu';
import { type Table } from '@omujs/omu/extension/table/table.js';
import type { Writable } from 'svelte/store';
import { Archive, type ArchiveConfig } from './archive.js';
import { ARCHIVE_TABLE, CONFIG_REGISTRY, OPEN_OUTPUT_DIR_ENDPOINT_TYPE } from './types.js';

export class ArchiveApp {
    public readonly archiveTable: Table<Archive>;
    public readonly config: Writable<ArchiveConfig>;

    constructor(private readonly omu: Omu) {
        this.archiveTable = omu.tables.get(ARCHIVE_TABLE);
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY));
    }

    public openOutputDir() {
        this.omu.endpoints.call(OPEN_OUTPUT_DIR_ENDPOINT_TYPE, null);
    }
}
