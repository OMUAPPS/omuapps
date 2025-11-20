<script lang="ts">
    import ButtonMini from './ButtonMini.svelte';
    import { Tooltip } from './index.js';

    interface Props {
        icon: string;
        text: string;
    }

    let { icon, text }: Props = $props();
</script>

<ButtonMini>
    <Tooltip>
        {text}
    </Tooltip>
    <i class="ti ti-{icon}"></i>aa
</ButtonMini>
