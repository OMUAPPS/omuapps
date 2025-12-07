<script lang="ts">
    import { popupStack } from './stores';

</script>

<svelte:window onclick={({ target }) => {
    for (const popup of $popupStack) {
        let parent = target as HTMLElement | null;
        while (parent) {
            if (popup.element.contains(target as Node)) {
                return;
            }
            parent = parent.parentElement;
        }
    }
    $popupStack.length = 0;
}} />

{#each $popupStack as popup, index (index)}
    {@render popup.render()}
{/each}
