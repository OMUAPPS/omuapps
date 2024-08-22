<script lang="ts">
    import { Text } from '@omujs/chat/models/content.js';

    export let component: Text;

    let rect = { width: 0, height: 0 };
</script>

<span>
    <input
        type="text"
        placeholder="text"
        bind:value={component.text}
        style:width="{rect.width || 32}px"
        style:height="{rect.height || 24}px"
    />
    <p bind:clientWidth={rect.width} bind:clientHeight={rect.height}>{component.text}</p>
</span>

<style>
    span {
        position: relative;
    }

    input {
        border-bottom: 1px solid var(--color-1);

        &::placeholder {
            opacity: 0.4;
        }
    }

    p {
        position: absolute;
        top: 0;
        left: 0;
        visibility: hidden;
        text-wrap: none;
        white-space: nowrap;
    }

    * {
        padding: 0;
        margin: 0;
        border: 0;
        font-size: 100%;
    }
</style>
