<script lang="ts">
    import AppPage from "$lib/components/AppPage.svelte";
    import AssetButton from "$lib/components/AssetButton.svelte";
    import { Chat, events } from "@omujs/chat";
    import { Message } from "@omujs/chat/models";
    import { OBSPlugin, permissions } from "@omujs/obs";
    import { Omu } from "@omujs/omu";
    import {
        AppHeader,
        ComponentRenderer,
        setClient,
        Tooltip,
    } from "@omujs/ui";
    import { BROWSER } from "esm-env";
    import { APP } from "./app.js";
    import EntryList from "./components/EntryList.svelte";
    import RouletteRenderer from "./components/RouletteRenderer.svelte";
    import SpinButton from "./components/SpinButton.svelte";
    import { RouletteApp } from "./roulette-app.js";

    const omu = new Omu(APP);
    setClient(omu);

    const chat = Chat.create(omu);
    const obs = OBSPlugin.create(omu);
    const roulette = new RouletteApp(omu);
    const { entries, state, config } = roulette;

    let joinKeyword = "";

    async function onMessage(message: Message) {
        if ($state.type !== "recruiting") return;
        if (!message.authorId) return;

        if (message.text.includes(joinKeyword)) {
            const id = `join-${message.authorId.key()}`;
            const author = await chat.authors.get(message.authorId.key());
            if ($entries[id] && !$config.editable) return;
            roulette.addEntry({
                id,
                name: author?.name || "",
                message: Message.serialize(message),
            });
        }
    }

    chat.on(events.message.add, (message) => onMessage(message));
    chat.messages.listen();

    if (BROWSER) {
        omu.permissions.require(permissions.OBS_SOURCE_CREATE_PERMISSION_ID);
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>

    <main>
        <div class="left">
            <h3>
                <span>
                    募集設定
                    <i class="ti ti-users"></i>
                </span>
                <button
                    class:recruiting={$state.type === "recruiting"}
                    on:click={() => roulette.toggleRecruiting()}
                >
                    {#if $state.type === "recruiting"}
                        募集を終了
                        <i class="ti ti-player-pause"></i>
                    {:else}
                        募集を開始
                        <i class="ti ti-player-play"></i>
                    {/if}
                </button>
            </h3>
            <div class="join-settings">
                <span>
                    <Tooltip>
                        参加キーワードを設定すると、チャットにそのキーワードが含まれるメッセージを受信したときに、
                        エントリーを追加します。
                    </Tooltip>
                    <input
                        type="text"
                        placeholder="参加キーワード…"
                        bind:value={joinKeyword}
                        class="join-keyword"
                    />
                </span>
            </div>
            <h3>
                <span>
                    エントリー
                    <i class="ti ti-list-numbers"></i>
                </span>
                <span class="buttons">
                    <button on:click={() => roulette.clearEntries()}>
                        <Tooltip>エントリーをすべて消す</Tooltip>
                        クリア
                        <i class="ti ti-trash"></i>
                    </button>
                    <button
                        on:click={() => {
                            let name = "エントリー";
                            let i = 1;
                            while (
                                Object.values($entries).some(
                                    (it) => it.name == `${name} ${i}`,
                                )
                            ) {
                                i++;
                            }
                            roulette.addEntry({
                                id: Date.now().toString(),
                                name: `${name} ${i}`,
                            });
                        }}
                    >
                        <Tooltip>エントリーを増やす</Tooltip>
                        追加
                        <i class="ti ti-plus"></i>
                    </button>
                </span>
            </h3>
            <section class="entries">
                <EntryList {roulette} />
            </section>
            <h3>
                <span>
                    配信ソフトに追加する
                    <i class="ti ti-arrow-bar-to-down"></i>
                </span>
            </h3>
            <AssetButton
                dimensions={{ width: 1080, height: 1080 }}
                {omu}
                {obs}
            />
        </div>
        <div class="right" class:end={$state.type === "spin-result"}>
            <div class="roulette">
                <RouletteRenderer {roulette} />
            </div>
            {#if $state.type === "spin-result"}
                {@const message =
                    $state.result.entry.message &&
                    Message.deserialize($state.result.entry.message)}
                <div class="result-container">
                    <div class="spin-result">
                        <p>
                            {$state.result.entry.name}
                        </p>
                        {#if message && message.authorId}
                            <div class="message">
                                {#await chat.authors.get(message.authorId.key()) then author}
                                    {#if author?.avatarUrl}
                                        <div class="author">
                                            <img
                                                src={omu.assets.proxy(
                                                    author?.avatarUrl,
                                                )}
                                                alt="icon"
                                            />
                                        </div>
                                    {/if}
                                    {#if message.content}
                                        <span class="content">
                                            <ComponentRenderer
                                                component={message.content}
                                            />
                                        </span>
                                    {/if}
                                {/await}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
            <div class="status">
                <div class="spin">
                    <SpinButton {roulette} />
                </div>
                <div class="state">
                    <span class:current={$state.type === "spin-start"}
                        >抽選開始</span
                    ><i class="ti ti-chevron-right"></i>
                    <span class:current={$state.type === "recruiting"}
                        >募集中</span
                    ><i class="ti ti-chevron-right"></i>
                    <span class:current={$state.type === "recruiting-end"}
                        >募集終了</span
                    >
                    <br />
                    <span class:current={$state.type === "idle"}>待機中</span><i
                        class="ti ti-chevron-right"
                    ></i>
                    <span class:current={$state.type === "spinning"}
                        >抽選中 <small>({$config.duration}秒)</small></span
                    ><i class="ti ti-chevron-right"></i>
                    <span class:current={$state.type === "spin-result"}
                        >結果</span
                    >
                </div>
            </div>
        </div>
    </main>
</AppPage>

<style lang="scss">
    $margin: 0.25rem;

    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: start;
        justify-content: flex-start;
        gap: 1rem;
        padding: 0 2rem;
        background: var(--color-bg-1);
        overflow: hidden;
    }

    .left {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 22rem;
        height: 100%;
        padding: 2rem 0;

        > h3 {
            display: flex;
            align-items: end;
            justify-content: space-between;
            margin-bottom: 0.75rem;
            font-size: 1rem;
            color: var(--color-1);

            > .buttons {
                display: flex;
                gap: 0.25rem;
            }
        }

        > section {
            margin-bottom: 2rem;
        }
    }

    .join-settings {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        align-items: center;
        width: 100%;
        margin-bottom: 2rem;

        > span {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            width: 100%;

            > input {
                border: 1px solid var(--color-outline);
                background: var(--color-bg-2);
                padding: 0.5rem 0.5rem;
                border-radius: 2.5px;

                &::placeholder {
                    font-size: 0.8rem;
                    font-weight: 600;
                    padding-left: 0.125rem;
                }

                &:focus {
                    outline: 1px solid var(--color-1);
                    outline-offset: -1px;
                }

                &:hover {
                    &::placeholder {
                        color: var(--color-1);
                        padding-left: 0.25rem;
                        transition: padding-left 0.0621s;
                    }
                }
            }
        }
    }

    .entries {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        overflow: auto;
        height: 100%;
    }

    button {
        background: var(--color-1);
        color: var(--color-bg-2);
        padding: 0.4rem 1rem;
        border: none;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
        border-radius: 2px;

        &:focus-visible,
        &:hover {
            background: var(--color-bg-2);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
            outline-offset: -1px;
        }
    }

    .right {
        position: relative;
        flex: 1;
        margin-left: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;

        > .status {
            position: absolute;
            bottom: 0;
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            align-items: end;
            justify-content: space-between;
            gap: 1rem;
            padding: 2rem 0;

            > .spin {
                width: 20rem;
            }

            > .state {
                color: var(--color-outline);
                font-weight: 500;

                > .current {
                    color: var(--color-1);
                    font-weight: 600;
                }
            }
        }
    }

    .roulette {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
    }

    .result-container {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
        pointer-events: none;
    }

    .spin-result {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: #fff;
        filter: drop-shadow(0 0 0.1rem rgba(0.5, 0.5, 0.5, 0.2));

        > p {
            text-align: center;
            font-size: 4rem;
            padding: 1rem 4rem;
            min-width: 18rem;
            background: #000;
        }

        > .message {
            visibility: hidden;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            gap: 1rem;

            .author {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }

            img {
                width: 4rem;
                height: 4rem;
                border-radius: 50%;
            }

            .content {
                display: flex;
                align-items: center;
                font-size: 1.5rem;
                padding: 0 1.5rem;
                height: 4rem;
                background: #fff;
                color: #000;
                margin-right: 2rem;
            }
        }
    }
    .end {
        $duration: 0.5s;

        .result-container {
            animation: result $duration forwards;
        }

        .message {
            animation: message $duration forwards;
            animation-delay: $duration;
        }

        .roulette {
            animation: roulette $duration forwards;
        }
    }

    @keyframes result {
        0% {
            transform: scale(0.78);
        }
        22% {
            transform: scale(1.03);
        }
        100% {
            transform: scale(1);
        }
    }

    @keyframes message {
        0% {
            visibility: visible;
            transform: translateY(2rem);
        }
        28% {
            visibility: visible;
            transform: translateY(-0.1rem);
        }
        100% {
            visibility: visible;
            transform: translateY(0rem);
        }
    }

    @keyframes roulette {
        0% {
            transform: scale(1.03);
            opacity: 1;
        }
        22% {
            transform: scale(0.43);
            opacity: 0.2;
        }
        100% {
            transform: scale(0.45);
            opacity: 0.23;
        }
    }
</style>
