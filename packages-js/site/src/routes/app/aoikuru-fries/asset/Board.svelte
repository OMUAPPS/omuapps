<script lang="ts">
    import board from './img/board.png';

    export let title: string;
    const width = 665;
    let textWidth: number;
</script>

<img
    src={board}
    alt=""
    style:transform="scale({Math.max(1.4, (textWidth + 200) / width)}, {title.includes('\n')
        ? 1.4
        : 1.4}) translateY(-35px)"
/>
<h1 bind:clientWidth={textWidth}>
    {#each title.split('\n') as line, index (index)}
        {line}
        <br />
    {/each}
</h1>

<style lang="scss">
    img {
        position: absolute;
        top: 0px;
        width: 603px;
        left: 1080px;
        object-fit: cover;
    }

    h1 {
        font-family: 'RocknRoll One', sans-serif;
        position: absolute;
        top: 46.8%;
        left: 73%;
        transform: translate(-50%, -50%);
        font-size: 100px;
        color: #77544b;
        white-space: pre;
    }
</style>
