<script lang="ts">
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { CaptionApp } from '../caption-app';
    import CaptionRenderer from '../CaptionRenderer.svelte';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();

    const captionApp = new CaptionApp(omu);

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
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
