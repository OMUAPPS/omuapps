<script lang="ts">
    import { screenContext, type ScreenComponent, type ScreenHandle } from './screen.js';

    let current: {
        screen: ScreenComponent<unknown>;
        handle: ScreenHandle;
        props: unknown;
    } | null = null;

    screenContext.current.subscribe((screen) => {
        if (!screen) {
            current = null;
            return;
        }
        const id = screen.id;
        const handle = {
            id: id,
            pop() {
                screenContext.pop(id);
            },
        };
        const props = screen.props;
        current = {
            screen,
            handle,
            props,
        };
    });
</script>

{#if current}
    {#key current.handle.id}
        <svelte:component this={current.screen.component} screen={current} />
    {/key}
{/if}
