<script lang="ts">
    import { fade, fly } from 'svelte/transition';

    interface SourceItem {
        name: string;
        selected: boolean;
        cursor?: boolean;
        icon?: string;
    }

    interface Props {
        scale: number;
        title: string;
        items: SourceItem[];
    }

    let { title, scale, items }: Props = $props();
</script>

<div class="container">
    <div class="tab" style:scale>
        <div class="header">
            {title}
        </div>
        <div class="items">
            {#each items.toReversed() as { name, selected, cursor, icon }, index (index)}
                <div
                    class="item"
                    class:selected
                    style:top="{(items.length - index - 1) * 42 + 16}px"
                    style:left="{selected ? 8 : 16}px"
                    in:fly={{ y: -16, duration: 400 }}
                    out:fade={{ duration: 100 }}
                >
                    <i class="ti {icon ?? 'ti-world'}"></i>
                    <p>{name}</p>
                    {#if cursor}
                        <div class="cursor">
                            <i class="ti ti-pointer-filled"></i>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<style lang="scss">
    $radius: 6px;

    .container {
        position: relative;
        filter: drop-shadow(16px 32px 8px rgba(0,0,0, 0.1));
    }

    .tab {
        width: 400px;
        height: 300px;
        background: #272A33;
        color: #FEFEFE;
        outline: 1px solid #3C404D;
        outline-offset: -1px;
        font-size: 16px;
        font-weight: 500;
        border-radius: $radius;
    }

    .header {
        height: 2em;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 8px 5px;
        background: #3C404D;
        border-radius: $radius $radius 0 0;
        margin: 1px;
    }

    .items {
        padding: 4px;
        position: relative;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 0.5em;
        position: absolute;
        width: calc(100% - 2em);
        padding: 0.5em 1em;
        border-radius: $radius;
        filter: drop-shadow(2px 4px 1px rgba(0,0,0,0.2));

        &.selected {
            outline: 1px solid #718CDC;
            background: #476BD7;
        }
    }

    .cursor {
        position: absolute;
        scale: -1;
        rotate: -80deg;
        filter: drop-shadow(2px -4px 4px rgba(0,0,0,0.4));
        -webkit-text-stroke: 2.5px #fff;
        color: var(--color-1);
        left: -1.75rem;
        top: 0.5rem;
        font-size: 2rem;
    }
</style>
