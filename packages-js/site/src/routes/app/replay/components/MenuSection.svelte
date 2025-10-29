<script lang="ts">
    export let name: string;
    export let icon: string;
    export let flex: number = 0;
    export let min: string = '';
</script>

<h3>
    {name}
    <i class="ti {icon}"></i>
    <slot name="actions" />
</h3>
<section style:flex style:min-height={min}>
    <slot />
</section>

<style lang="scss">
    h3 {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        white-space: nowrap;
        font-size: 1rem;
    }
</style>
