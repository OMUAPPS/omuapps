<script lang="ts">
    import { OBSPlugin } from '@omujs/obs';
    import type { Omu } from '@omujs/omu';
    import { onMount } from 'svelte';
    import { MarshmallowAPI } from './api.js';
    import { MarshmallowApp } from './marshmallow-app.js';

    export let omu: Omu;
    export let marshmallow: MarshmallowApp;
    export let obs: OBSPlugin;

    onMount(async () => {
        const api = await MarshmallowAPI.fromOmu(omu);
        const answers = await api.answers({
            before: new Date(),
        });
        console.log(answers);
    });
</script>

<main></main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: row;
        height: 100%;
    }
</style>
