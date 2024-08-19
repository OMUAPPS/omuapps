<script lang="ts">
    import Combobox from './Combobox.svelte';

    export let options = {
        a: { value: 'a', label: 'A' },
        b: { value: 'b', label: 'B' },
        c: { value: 'c', label: 'C' },
    };
    export let defaultValue = 'b';

    let value: string;
</script>

<Combobox {options} {defaultValue} on:change={(e) => (value = e.detail.value)} />

{value}
