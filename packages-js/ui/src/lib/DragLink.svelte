<script lang="ts">
    export let href: (() => string | URL) | string | URL;

    let preview: HTMLDivElement;

    function handleDragStart(event: DragEvent) {
        event.dataTransfer?.setDragImage(preview, 0, 0);
        const url = typeof href === 'function' ? href() : href;
        const urlString = typeof url === 'string' ? url : url.toString();
        event.dataTransfer?.setData('text/uri-list', urlString);
    }
</script>

<div class="container" on:dragstart={handleDragStart} draggable="true" role="form">
    <div class="preview" bind:this={preview}>
        <slot name="preview" />
    </div>
    <slot />
</div>

<style lang="scss">
    .preview {
        position: fixed;
        top: 0;
        left: 0;
        transform: translate(-1000%, -1000%);
    }

    .container {
        display: flex;
        flex-direction: column;
    }
</style>
