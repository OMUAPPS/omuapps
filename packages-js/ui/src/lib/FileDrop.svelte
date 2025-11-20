<script lang="ts">
    interface Props {
        primary?: boolean;
        multiple?: boolean;
        files?: FileList | null;
        accept?: string | null;
        handle?: (files: FileList) => void;
        fileDrop?: HTMLInputElement | null;
        button?: import('svelte').Snippet<[any]>;
        children?: import('svelte').Snippet;
    }

    let {
        primary = false,
        multiple = false,
        files = $bindable(null),
        accept = null,
        handle = () => {},
        fileDrop = $bindable(null),
        button,
        children,
    }: Props = $props();

    export const open = (): Promise<FileList> => {
        if (!fileDrop) return Promise.resolve(new FileList());
        fileDrop.click();
        return new Promise<FileList>((resolve) => {
            resolveOpen = resolve;
        });
    };

    let resolveOpen: ((files: FileList) => void) | null = null;

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

<input type="file" bind:this={fileDrop} bind:files onchange={handleChange} {multiple} {accept} hidden />
{#if button}{@render button({ open })}{:else}
    <button
        class:primary
        onclick={open}
    >
        {@render children?.()}
    </button>
{/if}

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
