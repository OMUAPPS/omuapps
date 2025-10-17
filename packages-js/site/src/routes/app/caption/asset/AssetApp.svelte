<script lang="ts">
    import type { Omu } from '@omujs/omu';
    import { DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID } from '@omujs/omu/api/dashboard';
    import { BROWSER } from 'esm-env';
    import { CaptionApp } from '../caption-app';
    import CaptionRenderer from '../CaptionRenderer.svelte';

    export let omu: Omu;

    const captionApp = new CaptionApp(omu);

    if (BROWSER) {
        omu.permissions.require(
            DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        );
        omu.start();
    }

</script>

<main>
    <CaptionRenderer {captionApp} />
</main>

<style>
    :global(body) {
        background: transparent !important;
    }

    main {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: end;
        padding: 1rem;
    }
</style>
