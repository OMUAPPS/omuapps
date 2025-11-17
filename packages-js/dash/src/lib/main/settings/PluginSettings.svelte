<script lang="ts">
    import { omu } from '$lib/client.js';
    import { TableList } from '@omujs/ui';
    import PluginEntry from './_components/PluginEntry.svelte';
    import ServiceEntry from './_components/ServiceEntry.svelte';
</script>

<TableList table={omu.server.apps} filter={(_, app) => app.type === 'service'} component={ServiceEntry} />
<TableList table={omu.plugins.getAllowedPackages()} component={PluginEntry} />
