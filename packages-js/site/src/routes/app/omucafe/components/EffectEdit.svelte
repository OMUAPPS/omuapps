<script lang="ts">
    import { type Effect } from '../game/effect.js';
    
    export let effect: Effect;
</script>

<main>
    <div class="info">
        <h3>エフェクト</h3>
        <label>
            エフェクト名
            <input type="text" bind:value={effect.name} />
        </label>
        <code>
            {JSON.stringify(effect, null, 2)}
        </code>
    </div>
    <div>
        <div>
            <h2>
                音
                {#if effect.attributes.audio}
                    <button on:click={() => {
                        effect.attributes.audio = undefined;
                    }} aria-label="削除">
                        <i class="ti ti-trash"></i>
                    </button>
                {:else}
                    <button on:click={() => {
                    }}>
                        音を設定
                    </button>
                {/if}
            </h2>
            {#if effect.attributes.audio}
                {effect.attributes.audio}
            {/if}
        </div>
        <div>
            <h2>粒子</h2>
            {#if effect.attributes.particle}
                {effect.attributes.particle}
            {/if}
        </div>
    </div>
</main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        display: flex;
        gap: 1rem;
    }

    .info {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
        height: 100%;
        padding: 1rem;
        outline: 1px solid var(--color-outline);
        background: var(--color-bg-2);
        box-shadow: 2px 0px 1px rgba($color: #000000, $alpha: 0.0621);
        overflow-y: auto;

        > label {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
    }

    h3 {
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.25rem;
        margin-bottom: 1rem;
    }

    input {
        padding: 0.5rem;
        border: 1px solid var(--color-outline);

        &:focus {
            outline: none;
            border-color: var(--color-1);
        }
    }

    code {
        white-space: pre-wrap;
        word-break: break-all;
        height: 18rem;
        overflow: auto;
        background: var(--color-bg-1);
        padding: 0.75rem;
    }
</style>
