<script lang="ts">
    import ButtonMini from "./ButtonMini.svelte";
    import { Tooltip } from "./index.js";

    export let icon: string;
    export let text: string;
</script>

<ButtonMini>
    <Tooltip>
        {text}
    </Tooltip>
    <i class="ti ti-{icon}" />aa
</ButtonMini>
