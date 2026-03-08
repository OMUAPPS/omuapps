<script lang="ts">
    import Section from "$lib/components/Section.svelte";
    import { Combobox } from "@omujs/ui";
    import AssetRenderer from "../asset/AssetRenderer.svelte";
    import { ChatOverlayApp } from "../chat-app";

    let { config } = ChatOverlayApp.getInstance();

    let tab: "asset" | "hud" = $state("hud");
</script>

<div class="container">
    <div class="preview">
        <div class="preview-inner">
            <AssetRenderer />
        </div>
        <div class="hint">75%</div>
    </div>
    <div class="settings">
        <Section name="見た目" icon="ti-palette">
            <label>
                <span>表示方法</span>
                <Combobox
                    options={{
                        default: {
                            label: "デフォルト",
                            value: "default",
                        },
                        youtube: {
                            label: "Youtube互換",
                            value: "youtube",
                        },
                    }}
                    bind:value={$config.asset.type}
                    on:change={({ detail: { value } }) => {
                        $config.asset.type = value as typeof $config.asset.type;
                    }}
                />
            </label>
            {#if $config.asset.type === "default"}
                <label>
                    <span>並び</span>
                    <Combobox
                        options={{
                            top: {
                                label: "新しいものは上",
                                value: "newer-top",
                            },
                            bottom: {
                                label: "新しいものは下",
                                value: "newer-bottom",
                            },
                        }}
                        bind:value={$config.asset.list.direction}
                        on:change={({ detail: { value } }) => {
                            $config.asset.list.direction =
                                value as typeof $config.asset.list.direction;
                        }}
                    />
                </label>
            {/if}
            <textarea
                onchange={(event) => {
                    $config.asset.css = (
                        event.target as HTMLTextAreaElement
                    ).value;
                }}
                value={$config.asset.css}
                rows={15}
            ></textarea>
        </Section>
    </div>
</div>

<style lang="scss">
    :global(#chat.yt-live-chat-renderer) {
        height: 100%;
    }

    .container {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 2rem;
    }

    .preview {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        overflow: hidden;
        pointer-events: none;
        outline: 2px solid var(--color-1);
        border-radius: 1rem;
        margin: 2rem;

        > .preview-inner {
            position: relative;
            width: 500px;
            height: 100%;
            scale: 0.75;
        }

        > .hint {
            position: absolute;
            left: 1rem;
            top: 1rem;
            font-size: 0.7rem;
        }

        &::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-position:
                0px 0px,
                14px 14px;
            background-size: 28px 28px;
            background-repeat: repeat;
            background-image: linear-gradient(
                    45deg,
                    #fff 25%,
                    transparent 25%,
                    transparent 75%,
                    #fff 75%,
                    #fff 100%
                ),
                linear-gradient(
                    45deg,
                    #fff 25%,
                    #444 25%,
                    #444 75%,
                    #fff 75%,
                    #fff 100%
                );
            opacity: 0.2;
        }
    }

    .settings {
        width: 20rem;
    }

    label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        font-size: 0.8rem;
    }

    textarea {
        width: 100%;
        background: var(--color-bg-2);
        border: 1px solid var(--color-1);
        color: var(--color-text);
        padding: 0.5rem;
        font-family: "Consolas", monospace;
        font-size: 0.75rem;
        resize: vertical;
        border-radius: 2px;
    }
</style>
