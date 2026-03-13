import type { Omu } from '@omujs/omu';
import type { Writable } from 'svelte/store';

interface TranslatorConfig {
    mode: {
        id: 'posify';
    } | null;
}

export class TranslatorApp {
    public readonly config: Writable<TranslatorConfig>;

    constructor(
        public readonly omu: Omu,
    ) {
        this.config = omu.registries.json<TranslatorConfig>('config', {
            default: { mode: null },
        }).compatSvelte();
    }
}
