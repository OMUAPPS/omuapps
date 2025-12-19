<script lang="ts">

    import { Button, ButtonMini, ExternalLink, FileDrop, Tooltip } from '@omujs/ui';
    import { createSkin, MarshmallowApp, type MarshmallowScreen } from '../marshmallow-app';
    import { hasPremium } from '../stores';
    import EditSkin from './EditSkin.svelte';

    const marshmallowApp = MarshmallowApp.getInstance();
    const { config } = marshmallowApp;

    interface Props {
        state: Extract<MarshmallowScreen, { type: 'skins' }>['state'];
        fetchUser: () => Promise<void>;
    }

    let { state = $bindable(), fetchUser }: Props = $props();

    $effect(() => {
        if (!$hasPremium) {
            state = { type: 'premium' };
        } else if (state.type === 'list' && Object.keys($config.skins).length === 0) {
            state = { type: 'create_or_upload' };
        } else if (state.type === 'create_or_upload' && Object.keys($config.skins).length !== 0) {
            state = { type: 'list' };
        }
    });
</script>

{#if state.type === 'list'}
    <div class="card">
        <div class="actions">
            <Button onclick={() => {
                const skin = createSkin();
                $config.skins[skin.id] = skin;
                state = { type: 'edit', skin };
            }}>
                作る
                <i class="ti ti-pencil"></i>
            </Button>
            <FileDrop handle={async (files) => {
                const skin = await marshmallowApp.loadSkin(files[0]);
                $config.skins = {
                    ...$config.skins,
                    [skin.id]: skin,
                };
            }} primary accept=".marshmallow">
                読み込む
                <i class="ti ti-upload"></i>
            </FileDrop>
        </div>
    </div>
    <div class="skins">
        {#each Object.entries($config.skins).reverse() as [id, skin](id)}
            {@const selected = !!$config.active_skins[skin.id]}
            <div class="skin">
                <div class="meta">
                    <p>{skin.meta.name}</p>
                    <small>{skin.meta.note}</small>
                </div>
                <div class="actions">
                    <ButtonMini onclick={() => {
                        state = {
                            type: 'edit',
                            skin,
                        };
                    }}>
                        <i class="ti ti-pencil"></i>
                    </ButtonMini>
                    <ButtonMini primary={selected} onclick={() => {
                        if (selected) {
                            const newActives = $config.active_skins;
                            delete newActives[skin.id];
                            $config.active_skins = newActives;
                        } else {
                            $config.active_skins = {
                                [skin.id]: { id: skin.id },
                            };
                        }
                    }}>
                        <Tooltip>
                            {#if selected}
                                選択を解除
                            {:else}
                                クリックで選択
                            {/if}
                        </Tooltip>
                        <i class="ti ti-check"></i>
                    </ButtonMini>
                </div>
            </div>
        {/each}
    </div>
{:else if state.type === 'create_or_upload'}
    <h4>着せ替え</h4>
    <small>マシュマロを好きな見た目に</small>
    <div class="card">
        <FileDrop handle={async (files) => {
            const skin = await marshmallowApp.loadSkin(files[0]);
            $config.skins = {
                ...$config.skins,
                [skin.id]: skin,
            };
        }} primary accept=".marshmallow">
            読み込む
            <i class="ti ti-upload"></i>
        </FileDrop>
        <Button primary onclick={() => {
            const skin = createSkin();
            $config.skins[skin.id] = skin;
            state = { type: 'edit', skin };
        }}>
            作る
        </Button>
    </div>
{:else if state.type === 'edit'}
    <EditSkin bind:skin={$config.skins[state.skin.id]} />
{:else if state.type === 'premium'}
    <div class="card">
        <div class="premium">
            <p>マシュマロのプレミアム会員限定</p>
            <small>着せ替え機能が使えます</small>
        </div>
        <ExternalLink href="https://marshmallow-qa.com/settings/premium">
            マシュマロ - プレミアム設定
            <i class="ti ti-external-link"></i>
        </ExternalLink>
        <Button primary onclick={fetchUser}>
            プレミアムの再確認
        </Button>
    </div>
{/if}

<style lang="scss">
    .premium {
        display: flex;
        flex-direction: column;
    }

    .card {
        display: flex;
        margin-top: 1rem;
        flex-direction: column;
        gap: 1rem;
        background: var(--color-bg-2);
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .skins {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .skin {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--color-bg-2);

        > .meta {
            display: flex;
            flex-direction: column;
            color: var(--color-1);

            > small {
                color: var(--color-text);
                font-size: 0.8rem;
            }
        }
    }

    .actions {
        display: flex;
        gap: 0.25rem;
    }
</style>
