import { makeRegistryWritable } from '$lib/helper.js';
import { version } from '$lib/version.json';
import { Omu } from '@omujs/omu';
import { setClient } from '@omujs/ui';
import { BROWSER } from 'esm-env';
import { APP } from './app.js';
import { CONFIG_REGISTRY_TYPE } from './translator.js';

export const omu = new Omu(APP);
setClient(omu);

export const config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));

if (BROWSER) {
    omu.plugins.require({
        omuplugin_translator: `==${version}`,
    });
    omu.start();
}
