<script lang="ts">
    import { Combobox } from '@omujs/ui';
    import type { Action } from '../../game/behavior/action.js';
    import { getGame } from '../../omucafe-app.js';

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

    .image {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 8rem;
        padding: 1rem;
        width: 100%;
        background: var(--color-bg-1);
    }

    .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-text);
        font-size: 0.8rem;
    }

    .actions {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
    }
</style>
