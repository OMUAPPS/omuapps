<script lang="ts">

    interface Props {
        href?: string;
        title?: string;
        text?: string;
    }

    let { href = '', title = undefined, text = '' }: Props = $props();

    let uri = $derived(new URL(!href.startsWith('/') ? href : 'https://' + href));
    let style = $derived(uri.searchParams.get('_style') || 'default' as 'default' | 'large');
    let [content, description] = $derived((text || title || href).split('\\\\'));
</script>

<a {href} {title} class={style} class:description>
    <span>
        {content}
        {#if !description}
            <i class="ti ti-external-link"></i>
        {/if}
    </span>
    {#if description}
        <small>
            {description}
        </small>
    {/if}
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
        padding: 2rem 2.5rem;
        font-size: 1.2rem;
        font-weight: 600;
        border-radius: 2px;
        background: var(--color-bg-1);
        color: var(--color-1);
        outline: 1px solid var(--color-1);
        outline-offset: -0.5rem;
        margin-top: 1rem;
        text-decoration: none;
    }

    .description {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 20rem;
    }

    small {
        font-size: 0.85rem;
        color: var(--color-text);
    }

    i {
        margin-left: 0.25rem;
    }
</style>
