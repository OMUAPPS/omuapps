<script lang="ts">
    import type { Content } from '@omujs/chat';

    interface Props {
        component: Content.Image;
    }

    let { component = $bindable() }: Props = $props();
</script>

<input type="text" bind:value={component.data.url} placeholder="url" />
<img src={component.data.url} alt="" />

<style lang="scss">
    img {
        max-height: 2rem;
    }
    input {
        height: 24px;
    }
</style>
