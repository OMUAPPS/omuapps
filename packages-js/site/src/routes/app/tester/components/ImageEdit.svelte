<script lang="ts">
    import type { content } from '@omujs/chat/models/index.js';
    
    export let component: content.Image;
</script>

<input type="text" bind:value={component.url} placeholder="url" />
<img src={component.url} alt="" />

<style lang="scss">
    img {
        max-height: 2rem;
    }
    input {
        height: 24px;
    }
</style>
