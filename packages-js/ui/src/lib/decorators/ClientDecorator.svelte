<script lang="ts">
    import { App, Omu } from '@omujs/omu';
    import { Identifier } from '@omujs/omu/identifier.js';
    import { client } from '../stores.js';

    const app = new App(Identifier.fromKey('com.omuapps:test'), {
        version: '1.0.0',
    });
    const omu = new Omu(app);
    client.set(omu);
</script>

<slot />
