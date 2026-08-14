<script lang=ts>
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OBSPermissions, OBSPlugin } from '@omujs/obs';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { AppHeader, AppPage, AssetButton, Button, setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP, ASSET_APP } from './app.js';
    import { CommentCounter } from './counter.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const chat = Chat.create(omu);
    const counter = new CommentCounter(omu, chat);
    setGlobal({ omu, chat, obs });

    if (BROWSER) {
        omu.permissions.require(
            ChatPermissions.CHAT_PERMISSION_ID,
            OmuPermissions.TABLE_PERMISSION_ID,
            OmuPermissions.GENERATE_TOKEN_PERMISSION_ID,
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.SESSIONS_READ_PERMISSION_ID,
            OBSPermissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
        omu.onReady(() => counter.initialize());
    }
</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={APP} />
        </header>
    {/snippet}

    <main>
        <section class=counter>
            <p class=label>この画面を開いてからのコメント</p>
            <strong>{counter.total.toLocaleString()}</strong>
            <p>{counter.rooms.length} 件の配信に接続中</p>
            <Button onclick={() => counter.reset()} disabled={counter.total === 0}>リセット</Button>
        </section>

        <section class=rooms>
            {#if counter.rooms.length === 0}
                <p class=empty>接続している配信はありません。</p>
            {:else}
                {#each counter.rooms as room (room.key())}
                    <article>
                        <span>{room.metadata.title || room.key()}</span>
                        <strong>{counter.getCount(room).toLocaleString()}</strong>
                    </article>
                {/each}
            {/if}
        </section>

        <section class=asset>
            <h2>OBSに表示</h2>
            <AssetButton
                asset={ASSET_APP}
                dimensions={{ width: 800, height: 300 }}
                permissions={[
                    ChatPermissions.CHAT_PERMISSION_ID,
                    OmuPermissions.TABLE_PERMISSION_ID,
                ]}
            />
        </section>
    </main>
</AppPage>

<style lang=scss>
    main {
        width: min(42rem, calc(100% - 2rem));
        margin: 0 auto;
        padding: 3rem 0;
    }

    .counter {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 2.5rem;
        border-radius: 1rem;
        background: var(--color-bg-2);

        > strong {
            font-size: clamp(5rem, 20vw, 9rem);
            line-height: 1;
            color: var(--color-1);
        }

        > p {
            margin: 0;
        }
    }

    .label {
        font-weight: 600;
    }

    .rooms {
        display: grid;
        gap: 0.5rem;
        margin-top: 1rem;

        article {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border-radius: 0.5rem;
            background: var(--color-bg-2);

            > span {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            > strong {
                font-size: 1.5rem;
                color: var(--color-1);
            }
        }
    }

    .empty {
        padding: 2rem;
        text-align: center;
        color: var(--color-outline);
    }

    .asset {
        margin-top: 2rem;

        > h2 {
            margin-bottom: 0.75rem;
            font-size: 1rem;
            color: var(--color-1);
        }
    }
</style>
