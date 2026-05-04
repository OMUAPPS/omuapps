<script lang="ts">
    import type { ValidateResult } from '../../core/helper';
    import type { Item } from '../../item';
    import { validateItem } from '../../item/item';

    interface Props {
        item: Item;
    }

    let {
        item = $bindable(),
    }: Props = $props();

    let result: ValidateResult<Item> = $state({ type: 'valid', value: item });
</script>

{#if result.type === 'invalid'}
    <div class="message">
        {result.message}
    </div>
{/if}

<textarea
    value={JSON.stringify(item, null, 2)}
    onchange={(event) => {
        try {
            const json = JSON.parse(event.currentTarget.value);
            const validationResult = validateItem(json);
            if (validationResult.type === 'valid') {
                item = validationResult.value;
            }
            result = validationResult;
        } catch (e) {
            result = { type: 'invalid', message: 'JSONのパースに失敗: ' + e };
        }
    }}
></textarea>

<style lang="scss">
    textarea {
        width: 100%;
        height: 300px;
        min-height: 300px;
        font-family: monospace;
        font-size: 0.9rem;
        padding: 0.5rem;
        font-size: 0.8rem;
        border: none;
        outline: 1px solid var(--color-1);
        border-radius: 0.5rem;
    }

    .message {
        margin-top: 1rem;
        color: red;
    }
</style>
