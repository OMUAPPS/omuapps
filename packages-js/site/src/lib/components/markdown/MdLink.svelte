<script lang="ts">

    interface Props {
        href?: string;
        title?: any;
        text?: string;
    }

    let { href = '', title = undefined, text = '' }: Props = $props();

    let uri = $derived(new URL(!href.startsWith('/') ? href : 'https://' + href));
    let style = $derived(uri.searchParams.get('_style') || 'default' as 'default' | 'large');
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
        background: var(--color-1);
        color: var(--color-bg-2);
        font-size: 1rem;
        margin-top: 1rem;
    }

    i {
        margin-left: 0.25rem;
    }
</style>
