<script lang="ts">
    interface Props {
        href: string;
        text: string;
        title: string | null;
    }

    let { href, text, title }: Props = $props();
</script>

<img src={href} alt={text} {title}>

<style lang="scss">
    img {
        width: min(40rem, 100%);
        max-width: fit-content;
        max-height: fit-content;
    }
</style>
