<script lang="ts">
    export let href: string;
    export let text: string;
    export let title: string | null;
</script>

<img src={href} alt={text} {title}>

<style lang="scss">
    img {
        width: min(40rem, 100%);
        max-width: fit-content;
        max-height: fit-content;
    }
</style>
