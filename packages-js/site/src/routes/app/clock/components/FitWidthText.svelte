<script lang="ts">
    let width = 0;
    let containerWidth = 0;
    let fontSize = 20;
</script>

<div bind:clientWidth={containerWidth} style="position: relative; width: 100%;">
    <div bind:clientWidth={width} style="position: absolute; top: 0; left: 0; visibility: hidden;">
        {@render children?.()}
    </div>
</div>
<span style:font-size={Math.min(fontSize, containerWidth / width * fontSize)}px>
    {@render children?.()}
</span>
