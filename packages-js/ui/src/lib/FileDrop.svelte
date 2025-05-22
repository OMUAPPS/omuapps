<script lang="ts">
    export let primary = false;
    export let multiple = false;
    export let files: FileList | null = null;
    export let accept: string | null = null;
    export let handle: (files: FileList) => void = () => {};
    export let fileDrop: HTMLInputElement | null = null;
    
    export const open = (): Promise<FileList> => {
        if (!fileDrop) return;
        fileDrop.click();
        return new Promise<FileList>((resolve) => {
            resolveOpen = resolve;
        });
    };

    let resolveOpen: (files: FileList) => void | null = null;

    function handleChange(event: Event): void {
        files = (event.target as HTMLInputElement).files;

        if (files) {
            handle(files);
            if (resolveOpen) {
                resolveOpen(files);
                resolveOpen = null;
            }
        }
    }
</script>

<input type="file" bind:this={fileDrop} bind:files on:change={handleChange} {multiple} {accept} hidden />
<slot {open} name="button">
    <button
        class:primary
        on:click={open}
    >
        <slot />
    </button>
</slot>

<style lang="scss">
    button {
        cursor: pointer;
        background: var(--color-bg-1);
        border: none;
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        padding: 0.5rem 1rem;
        color: var(--color-1);
        font-weight: 600;
        font-size: 0.8rem;
        border-radius: 2px;
        white-space: nowrap;
        touch-action: manipulation;

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
        }

        &:focus {
            outline: 1px solid var(--color-1);
        }
    }

    .primary {
        background: var(--color-1);
        color: var(--color-bg-1);

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
        }
    }
</style>
