<script lang="ts">
    import Highlight from 'svelte-highlight';
    import bash from 'svelte-highlight/languages/bash';
    import typescript from 'svelte-highlight/languages/typescript';

    interface Props {
        lang: string;
        text: string;
    }

    let { lang, text }: Props = $props();

    let language = {
        typescript,
        bash,
    }[lang] || typescript;
</script>

<span>
    <Highlight
        {language}
        code={text.replace('&lt;', '<').replace('&gt;', '>')}
    />
</span>

<style lang="scss">
    span {
        display: inline-flex;
        margin: 0 0.25rem;
        line-height: 0.75;
        color: #444;
        background: #f6f6f6;
        outline: 1px solid var(--color-outline);
        border-radius: 3px;
        user-select: text;
        font-family: monospace;
        font-weight: 600;
    }
</style>
