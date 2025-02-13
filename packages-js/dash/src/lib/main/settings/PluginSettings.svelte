<script lang="ts">
    import { omu } from '$lib/client.js';
    import { TableList } from '@omujs/ui';
    import PluginEntry from './PluginEntry.svelte';
</script>

<TableList table={omu.plugins.getAllowedPackages()} component={PluginEntry} />
