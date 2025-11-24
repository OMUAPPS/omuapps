<script lang="ts">
    import Combobox from './Combobox.svelte';

    export let options = {
        a: { value: 'a', label: 'A' },
        b: { value: 'b', label: 'B' },
        c: { value: 'c', label: 'C' },
    };
    export let value = 'b';
</script>

<p>value: {value}</p>
<Combobox {options} bind:value />
