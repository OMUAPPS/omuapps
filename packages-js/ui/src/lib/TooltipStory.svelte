<script lang="ts">
    import Tooltip from './Tooltip.svelte';

    export let text: string;
    export let image: string;
</script>

<button>
    <Tooltip>
        {text}
    </Tooltip>
    Text
</button>
<button>
    <Tooltip>
        <img src={image} alt={text} />
    </Tooltip>
    Image
</button>
