<script lang="ts">
    import { dashboard } from '$lib/client.js';
    import Screen from '$lib/common/screen/Screen.svelte';
    import type { ScreenHandle } from '$lib/common/screen/screen.js';
    import { TableList } from '@omujs/ui';
    import AppEntry from './AppEntry.svelte';

    export let screen: {
        handle: ScreenHandle;
        props: undefined;
    };
</script>

<Screen {screen} title="manage-apps">
    <div class="container">
        <ul>
            <TableList table={dashboard.apps} component={AppEntry} />
        </ul>
    </div>
</Screen>

<style lang="scss">
    .container {
        position: relative;
        height: 100%;
        width: 100%;
    }

    ul {
        list-style: none;
        padding: 0;
        height: 100%;
    }
</style>
