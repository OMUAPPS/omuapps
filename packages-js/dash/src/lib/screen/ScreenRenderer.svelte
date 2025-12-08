<script lang="ts">
    import { currentPage } from '$lib/settings';
    import { screenEntries } from './screen';

    let current = $derived.by(() => {
        let currentScreens = $screenEntries.filter((entry) => entry.target === $currentPage);
        if (currentScreens.length > 0) {
            return currentScreens.at(0);
        }
        return $screenEntries.at(0);
    });

    $effect(() => {
        console.log($screenEntries, current);
    });
</script>

{#if current}
    {#key current.id}
        <div class="screen">
            <current.component
                handle={{
                    id: current.id,
                    close: () => {
                        $screenEntries = $screenEntries.filter((entry) => entry.id !== current.id);
                    },
                }}
                props={current.props}
            />
        </div>
    {/key}
{/if}

<style lang="scss">
    .screen {
        position: absolute;
        inset: 0;
    }
</style>
