<script lang="ts">
    import { screenContext, type ScreenComponent, type ScreenHandle } from './screen.js';

    let current: {
        screen: ScreenComponent<unknown>;
        handle: ScreenHandle;
        props: unknown;
    } | null = $state(null);

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
        <current.screen.component handle={current.handle} props={current.props} />
    {/key}
{/if}
