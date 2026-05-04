<script lang="ts">
    import { Checkbox, Combobox, FileDrop, Slider, Tooltip } from '@omujs/ui';
    import Collapse from '../../common/Collapse.svelte';
    import EditAsset from '../../common/EditAsset.svelte';
    import { Game } from '../../core/game';
    import type { AttrParticle } from './particle';

    interface Props {
        attr?: AttrParticle;
    }

    let { attr = $bindable() }: Props = $props();

    const game = Game.getInstance();
</script>

{#if attr}
    {@const particle = attr}
    <Collapse name="画像">
        {#each attr.assets as _, index (index)}
            <div class="asset">
                <EditAsset bind:asset={attr.assets[index]} remove={() => {
                    particle.assets = particle.assets.filter((_, i) => i !== index);
                    attr = { ...particle };
                }} />
            </div>
        {/each}
        <FileDrop accept="image/*" handle={async (files) => {
            for (const file of files) {
                particle.assets = [...particle.assets, await game.asset.uploadFile(file)];
                attr = { ...particle };
            }
        }} primary multiple>
            画像を追加
        </FileDrop>
    </Collapse>
    <Collapse name="出現">
        <label>
            個数
            <Slider bind:value={attr.count} min={0} max={16} step={1} />
        </label>
        <label>
            長さ（秒）
            <Slider bind:value={attr.duration} min={0} max={16} step={1} />
        </label>
    </Collapse>
    <Collapse name="動き">
        <label>
            横の方向
            <Combobox bind:value={attr.direction.horizontal} options={{
                left: {
                    label: '左',
                    value: 'left',
                },
                right: {
                    label: '右',
                    value: 'right',
                },
                both: {
                    label: '左右',
                    value: 'both',
                },
            }} />
        </label>
        <label>
            縦の方向
            <Combobox bind:value={attr.direction.vertical} options={{
                up: {
                    label: '上',
                    value: 'up',
                },
                down: {
                    label: '下',
                    value: 'down',
                },
                both: {
                    label: '上下',
                    value: 'both',
                },
            }} />
        </label>
        <label>
            位置：横
            <Slider bind:value={attr.origin.x} min={-512} max={512} step={1} />
        </label>
        <label>
            位置：縦
            <Slider bind:value={attr.origin.y} min={-512} max={512} step={1} />
        </label>
        <label>
            位置のずれ：横
            <Slider bind:value={attr.position.x} min={0} max={512} step={1} />
        </label>
        <label>
            位置のずれ：縦
            <Slider bind:value={attr.position.y} min={0} max={512} step={1} />
        </label>
        <label>
            横の速度
            <Slider bind:value={attr.velocity.x} min={0} max={128} step={1} />
        </label>
        <label>
            縦の速度
            <Slider bind:value={attr.velocity.y} min={0} max={128} step={1} />
        </label>
        <label>
            横の加速度
            <Slider bind:value={attr.acceleration.x} min={-256} max={256} step={1} />
        </label>
        <label>
            縦の加速度
            <Slider bind:value={attr.acceleration.y} min={-256} max={256} step={1} />
        </label>
        <label>
            <Tooltip>
                位置と速度をランダム化します
            </Tooltip>
            速度のランダム化
            <Checkbox bind:value={attr.random} />
        </label>
    </Collapse>
{/if}
