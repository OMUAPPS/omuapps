<script lang="ts">
    import type { App } from '@omujs/omu';

    export let props: {
        app: App;
    };
</script>

<iframe src={props.app.url} title="" frameborder="0" allow="camera; microphone"></iframe>

<style lang="scss">
    iframe {
        width: 100%;
        height: 100%;
        border: none;
    }
</style>
