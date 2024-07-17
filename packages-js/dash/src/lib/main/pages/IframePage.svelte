<script lang="ts">
    export let props: {
        url: string;
    };
</script>

<iframe src={props.url} title="" frameborder="0" allow="camera; microphone"></iframe>

<style lang="scss">
    iframe {
        width: 100%;
        height: 100%;
        border: none;
    }
</style>
