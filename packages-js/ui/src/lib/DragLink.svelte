<script lang="ts">
    type UrlLike = string | URL | Promise<string | URL> | (() => UrlLike);
    export let href: UrlLike;

    let preview: HTMLDivElement;

    async function resolveUrl(url: UrlLike): Promise<string> {
        if (typeof url === 'string') {
            return url;
        } else if (url instanceof URL) {
            return url.toString();
        } else if (typeof url === 'function') {
            return resolveUrl(url());
        } else {
            return resolveUrl(await url);
        }
    }

    async function handleDragStart(event: DragEvent) {
        if (!event.dataTransfer) return;
        event.dataTransfer.setDragImage(preview, 0, 0);
        const url = await resolveUrl(href);
        event.dataTransfer.setData('text/uri-list', url);
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
