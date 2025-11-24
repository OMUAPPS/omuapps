<script lang="ts">
    import Tooltip from './Tooltip.svelte';

    export let text: string;
    export let image: string;
</script>

<div class="left top">
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
</div>
<div class="right top">
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
</div>
<div class="right bottom">
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
</div>
<div class="left bottom">
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
</div>
<div class="center">
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
</div>

<style>
    button {
        margin: 10px;
    }

    div {
        position: fixed;
    }

    .left {
        left: 0;
    }

    .top {
        top: 0;
    }

    .right {
        right: 0;
    }

    .bottom {
        bottom: 0;
    }

    .center {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
</style>
