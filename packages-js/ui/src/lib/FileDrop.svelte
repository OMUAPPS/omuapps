<script lang="ts">
    export let multiple = false;
    export let files: FileList | null = null;
    export let accept: string | null = null;
    export let handle: (files: FileList) => void = () => {};
    export let fileDrop: HTMLInputElement | null = null;
    export const open = (): void => {
        if (!fileDrop) return;
        fileDrop.click();
    };

    function handleChange(event: Event): void {
        files = (event.target as HTMLInputElement).files;

        if (files) {
            handle(files);
        }
    }
</script>

<input type="file" bind:this={fileDrop} bind:files on:change={handleChange} {multiple} {accept} hidden />
<slot {open} name="button">
    <button on:click={open}>
        <slot />
    </button>
</slot>

<style lang="scss">
    button {
        cursor: pointer;
        background: var(--color-bg-1);
        border: 1px solid var(--color-1);
        padding: 0.5rem 1rem;
        color: var(--color-1);
        font-weight: 600;
        font-size: 0.9rem;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }

        &:focus {
            outline: 1px solid var(--color-1);
        }
    }
</style>
