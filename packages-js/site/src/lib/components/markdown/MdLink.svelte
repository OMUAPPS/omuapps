<script lang="ts">
    
    export let href = '';
    export let title = undefined;
    export let text = '';

    $: uri = new URL(!href.startsWith('/') ? href : 'https://' + href);
    $: style = uri.searchParams.get('_style') || 'default' as 'default' | 'large';
</script>

<a {href} {title} class={style}>
    {text || title || href}
    <i class="ti ti-external-link"></i>
</a>

<style lang="scss">
    a {
        display: inline-flex;
        align-items: baseline;
        color: var(--color-1);
        text-decoration: none;
        margin: 2px;
    }

    .default {
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        outline: 1px solid var(--color-outline);
    }

    .large {
        padding: 0.75rem 2rem;
        border-radius: 2px;
        outline: 2px solid var(--color-outline);
        font-size: 1rem;
        margin-top: 1rem;
    }

    i {
        margin-left: 0.25rem;
    }
</style>
