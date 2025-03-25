<script lang="ts">

    import type { Omu } from '@omujs/omu';
    import { FileDrop } from '@omujs/ui';
    import Gallery from '../_components/Gallery.svelte';
    import type { RemoteApp } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;

</script>

<main>
    <div class="header">
        <small>
            追加する画像を選択してください
        </small>
        <FileDrop handle={(files) => {
            remote.upload(...files);
        }} primary multiple accept="image/*">
            画像を追加
            <i class="ti ti-upload"></i>
        </FileDrop>
    </div>
    <div class="gallery">
        <Gallery {omu} {remote} />
    </div>
</main>

<style>
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        font-size: 1.6rem;
    }

    .gallery {
        flex: 1;
        overflow: auto;
    }

    .header {
        background: var(--color-bg-2);
        padding: 1rem 2rem;
        height: 25%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        border-bottom: 1px solid var(--color-outline);
    }
</style>
