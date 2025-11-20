<script lang="ts">
    import Combobox from './Combobox.svelte';

    interface Props {
        options?: any;
        value?: string;
    }

    let { options = {
        a: { value: 'a', label: 'A' },
        b: { value: 'b', label: 'B' },
        c: { value: 'c', label: 'C' },
    }, value = $bindable('b') }: Props = $props();
</script>

<p>value: {value}</p>
<Combobox {options} bind:value />
