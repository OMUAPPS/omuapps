<script lang="ts">

    import type { Omu } from '@omujs/omu';
    import Gallery from '../_components/Gallery.svelte';
    import type { RemoteApp } from '../remote-app.js';

    export let omu: Omu;
    export let remote: RemoteApp;

</script>

<main>
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
</style>
