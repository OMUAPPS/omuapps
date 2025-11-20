<script lang="ts">
    import { ChatPermissions, Models } from '@omujs/chat';
    import type { Omu } from '@omujs/omu';
    import { AssetButton, Button, ButtonMini, FileDrop, Slider, Tooltip } from '@omujs/ui';
    import { APP_ID, ASSET_APP } from './app';
    import ReactionRenderer from './components/ReactionRenderer.svelte';
    import type { ReactionApp } from './reaction-app';

    interface Props {
        omu: Omu;
        reactionApp: ReactionApp;
    }

    let { omu, reactionApp }: Props = $props();

    const { config } = reactionApp;

    function test() {
        const reaction = new Models.Reaction({
            roomId: APP_ID.join('test'),
            reactions: {
                '❤': 1,
                '😄': 1,
                '🎉': 1,
                '😳': 1,
                '💯': 1,
            },
        });
        reactionApp.send(reaction);
    }

    async function handleReplace(key: string, files: FileList) {
        const file = files[0];
        const reader = new FileReader();
        const id = omu.app.id.join('asset', key);
        reader.onload = async () => {
            const buffer = new Uint8Array(reader.result as ArrayBuffer);
            const asset = await omu.assets.upload(id, buffer);
            $config.replaces = { ...$config.replaces, [key]: asset.key() };
        };
        reader.readAsArrayBuffer(file);
    }
</script>
<div class="reaction-preview">
    <ReactionRenderer {omu} {reactionApp} />
</div>
<div class="actions">
    <h2>
        配信ソフトに追加する
        <i class="ti ti-arrow-bar-to-down"></i>
    </h2>
    <section>
        <AssetButton asset={ASSET_APP} permissions={[
            ChatPermissions.CHAT_PERMISSION_ID,
            ChatPermissions.CHAT_REACTION_PERMISSION_ID,
        ]} />
    </section>
    <h2>
        試してみる
        <i class="ti ti-rocket"></i>
    </h2>
    <section>
        <Button primary onclick={test}>
            <Tooltip>
                <span>テスト用のリアクションを送信します</span>
            </Tooltip>
            再生
            <i class="ti ti-player-play"></i>
        </Button>
    </section>
</div>
<div class="options omu-scroll">
    <h2>
        見た目を調整する
        <i class="ti ti-dimensions"></i>
    </h2>
    <section class="settings">
        <Slider
            bind:value={$config.scale}
            min={0.5}
            max={2.5}
            step={0.05}
            type="percent"
            clamp={false}
        >
            大きさ
        </Slider>
        <Slider
            bind:value={$config.depth}
            min={0}
            max={1}
            step={0.01}
            type="percent"
        >
            奥行き感
        </Slider>
    </section>
    <h2>
        画像を変える
        <i class="ti ti-mood-wink-2"></i>
    </h2>
    <section>
        {#each Object.entries($config.replaces) as [key, assetId] (key)}
            <div class="replace-entry">
                <div class="preview">
                    <h1>
                        {key}
                    </h1>
                    {#if assetId}
                        <i class="ti ti-chevron-right"></i>
                        <img
                            src={omu.assets.url(assetId, {
                                cache: 'no-cache',
                            })}
                            alt={key}
                            class="replace-image"
                        />
                    {/if}
                </div>
                {#if assetId}
                    <ButtonMini
                        onclick={() =>
                            ($config.replaces = {
                                ...$config.replaces,
                                [key]: null,
                            })}
                    >
                        <Tooltip>置き換えを削除</Tooltip>
                        <i class="ti ti-trash"></i>
                    </ButtonMini>
                {/if}
                <FileDrop handle={(files) => handleReplace(key, files)}>
                    <i class="ti ti-upload"></i>
                    置き換える
                </FileDrop>
            </div>
        {/each}
    </section>
</div>

<style lang="scss">
    .options {
        width: 24rem;
        padding: 2.5rem 0;
        padding-right: 2rem;
    }

    .actions {
        width: 25rem;
        padding: 2.5rem 0;
    }

    .settings {
        background: var(--color-bg-2);
        padding: 20px;
    }

    .reaction-preview {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: -1;
    }

    .replace-entry {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        width: min(100%, 25rem);
        padding: 0.5rem 1rem;
        background: var(--color-bg-2);

        .preview {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            margin-right: auto;
        }
    }

    .replace-image {
        max-height: 50px;
        min-width: 50px;
        object-fit: contain;
    }

    h1 {
        font-family: "Noto Color Emoji";
    }

    h2 {
        color: var(--color-1);
        margin-bottom: 0.5rem;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        padding: 0px;
        margin-bottom: 1rem;
    }

    img {
        max-width: 100%;
        max-height: 40px;
    }
</style>
