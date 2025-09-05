<script lang="ts">
    import { Button, ButtonMini, FileDrop, Tooltip } from '@omujs/ui';
    import { uploadAssetByBlob } from '../asset/asset.js';
    import { createClip } from '../asset/audioclip.js';
    import FitInput from '../components/FitInput.svelte';
    import { getGame } from '../omucafe-app.js';
    import EffectParticleEdit from './EditEffectParticle.svelte';
    import EffectSoundEdit from './EditEffectSound.svelte';
    import { createEffectSound, createParticle, type EffectState } from './effect-state.js';
    
    export let effect: EffectState;
    
    const { scene, gameConfig } = getGame();
</script>

<main>
    <div class="info omu-scroll">
        <div class="name">
            <h1>
                <Tooltip>
                    {effect.id}
                </Tooltip>
                <FitInput bind:value={effect.name} />
            </h1>
            <ButtonMini on:click={async () => {
                await navigator.clipboard.writeText(effect.id);
            }} primary>
                <Tooltip>
                    IDをコピー
                </Tooltip>
                <i class="ti ti-copy"></i>
            </ButtonMini>
            <ButtonMini on:click={() => {
                $scene = { type: 'product_list' };
                delete $gameConfig.effects[effect.id];
            }} primary>
                <Tooltip>
                    削除
                </Tooltip>
                <i class="ti ti-trash"></i>
            </ButtonMini>
        </div>
        <div class="attribute">
            <div class="head">
                粒子
                <Button onclick={async () => {
                    effect.attributes.particle = effect.attributes.particle ? undefined : createParticle({});
                }} primary>
                    {#if effect.attributes.particle}
                        粒子を削除
                        <i class="ti ti-trash"></i>
                    {:else}
                        粒子を追加
                        <i class="ti ti-plus"></i>
                    {/if}
                </Button>
            </div>
            {#if effect.attributes.particle}
                <EffectParticleEdit bind:particle={effect.attributes.particle} />
            {/if}
        </div>
        <div class="attribute">
            <div class="head">
                音
                <FileDrop handle={async (files) => {
                    const [file] = files;
                    const asset = await uploadAssetByBlob(file);
                    effect.attributes.sound = effect.attributes.sound ? undefined : createEffectSound({
                        clip: await createClip({
                            asset,
                        }),
                    });
                }} primary>
                    {#if effect.attributes.sound}
                        音を削除
                        <i class="ti ti-trash"></i>
                    {:else}
                        音を追加
                        <i class="ti ti-plus"></i>
                    {/if}
                </FileDrop>
            </div>
            {#if effect.attributes.sound}
                <EffectSoundEdit bind:sound={effect.attributes.sound} />
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
        align-items: stretch;
        justify-content: flex-start;
        flex-direction: column;
        padding: 1rem;
        padding-top: 8rem;
        padding-left: 2rem;
        width: 24rem;
        gap: 2rem;
        overflow-x: hidden;
        background: var(--color-bg-1);
        border-right: 1px solid var(--color-1);
        outline: 2px solid var(--color-bg-1);
    }

    .name {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--color-outline);
        margin-bottom: 0.5rem;
        padding-bottom: 1rem;

        > h1 {
            margin-right: auto;
        }
    }

    .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        font-size: 1.5rem;
        border-bottom: 1px solid var(--color-1);
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .attribute {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }
</style>
