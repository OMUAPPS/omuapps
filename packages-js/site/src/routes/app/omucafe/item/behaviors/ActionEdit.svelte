<script lang="ts">
    import { Combobox } from '@omujs/ui';
    import { getGame } from '../../omucafe-app.js';
    import type { Action } from './action.js';


    export let behavior: Action;

    const { gameConfig } = getGame();
    $: scripts = {
        '': {
            label: '',
            values: undefined,
        },
        ...Object.fromEntries([...Object.entries($gameConfig.scripts).map(([key, value]) => {
            return [key, {
                label: value.name,
                value: key,
            }];
        })])
    };
</script>

<div class="behavior">
    <div class="setting">
        クリック
        <Combobox options={scripts} bind:value={behavior.on.click} />
    </div>
    <div class="setting">
        内容物をクリック
        <Combobox options={scripts} bind:value={behavior.on.clickChild} />
    </div>
    <div class="setting">
        内容物を追加
        <Combobox options={scripts} bind:value={behavior.on.dropChild} />
    </div>
</div>

<style lang="scss">
    .behavior {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
    }

    .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-text);
        font-size: 0.8rem;
    }
</style>
