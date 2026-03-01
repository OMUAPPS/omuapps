<script lang="ts">
    import { omu } from '$lib/client';
    import type { LocalizedText } from '@omujs/omu/localization';

    interface Props {
        old?: LocalizedText | string;
        new?: LocalizedText | string;
    }

    let { old, new: newText }: Props = $props();

    function translate(text: LocalizedText | string | undefined): string | undefined {
        if (typeof text === 'string' || !text) {
            return text;
        } else {
            return omu.i18n.translate(text);
        }
    }

    let oldTextTranslated = $derived(translate(old));
    let newTextTranslated = $derived(translate(newText));
</script>

{#if oldTextTranslated === newTextTranslated}
    <span>{oldTextTranslated}</span>
{:else}
    <span class="diff">
        {#if oldTextTranslated}
            <i class="ti ti-minus"></i>
            <span class="old">
                {oldTextTranslated}
            </span>
        {/if}
        {#if newTextTranslated}
            <br>
            <span class="new">
                <i class="ti ti-plus"></i>
                {newTextTranslated}
            </span>
        {/if}
    </span>
{/if}

<style>
    .diff {
        position: relative;
    }

    .ti-minus {
        color: rgb(212, 66, 66);
    }

    .old {
        color: rgb(212, 66, 66);
        text-decoration: line-through;
    }

    .new {
        color: rgb(45, 139, 45);
    }
</style>
