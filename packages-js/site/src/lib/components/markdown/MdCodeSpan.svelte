<script lang="ts">
    import Highlight from 'svelte-highlight';
    import typescript from 'svelte-highlight/languages/typescript';

    export let lang: string;
    export let text: string;

    let language = {
        typescript
    }[lang] || typescript;
</script>

<span>
    <Highlight
        {language}
        code={text}
    />
</span>

<style lang="scss">
    span {
        display: inline-flex;
        margin: 0 0.25rem;
        padding: 0.25rem 0.5rem;
        outline: 1px solid var(--color-outline);
        border-radius: 3px;
        user-select: text;
    }
</style>
