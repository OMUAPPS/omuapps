<script lang="ts">
    import { popupStack } from './stores';

</script>

<svelte:window onclick={({ target }) => {
    for (const popup of $popupStack) {
        let current = target as HTMLElement | null;
        while (current) {
            if (
                popup.element === current
                || popup.content === current
                || popup.content?.contains(current)
            ) {
                return;
            }
            current = current.parentElement;
        }
    }
    $popupStack.length = 0;
}} />

{#each $popupStack as popup, index (index)}
    {@render popup.render()}
{/each}
