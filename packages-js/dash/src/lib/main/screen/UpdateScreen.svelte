<script lang="ts">
    import { omu } from "$lib/client.js";
    import Screen from "$lib/screen/Screen.svelte";
    import type { ScreenHandle } from "$lib/screen/screen.js";
    import { invoke } from "$lib/tauri.js";
    import { Popup } from "@omujs/ui";
    import { relaunch } from "@tauri-apps/plugin-process";
    import { type Update } from "@tauri-apps/plugin-updater";

    export let screen: {
        handle: ScreenHandle;
        props: {
            update: Update;
        };
    };
    const { update } = screen.props;
    const date = update.date && new Date(update.date.replace(/:00$/, ""));

    type State = "idle" | "updating" | "shutting-down" | "restarting";
    let state: State = "idle";

    async function applyUpdate() {
        state = "shutting-down";
        try {
            omu.server.shutdown();
            invoke("stop_server");
        } catch (e) {
            console.error(e);
        }
        state = "updating";
        let downloaded = 0;
        let contentLength = 0;
        // alternatively we could also call update.download() and update.install() separately
        await update.downloadAndInstall((event) => {
            switch (event.event) {
                case "Started":
                    contentLength = event.data.contentLength || 0;
                    console.log(
                        `started downloading ${event.data.contentLength} bytes`,
                    );
                    break;
                case "Progress":
                    downloaded += event.data.chunkLength;
                    console.log(
                        `downloaded ${downloaded} from ${contentLength}`,
                    );
                    break;
                case "Finished":
                    console.log("download finished");
                    break;
            }
        });

        console.log("update installed");
        await relaunch();
        state = "restarting";
    }

    let open = false;
</script>

<Screen {screen} title="update">
    {#if state === "updating"}
        <div class="info">
            <h3>新しいバージョンをダウンロードしています...</h3>
        </div>
    {:else if state === "shutting-down"}
        <div class="info">
            <h3>サーバーをシャットダウンしています...</h3>
        </div>
    {:else if state === "restarting"}
        <div class="info">
            <h3>インストーラーを起動しています...</h3>
        </div>
    {:else}
        <div class="info">
            <h3>
                新しいバージョンが利用可能です🎉
                <hr />
                v{update.version}
                {#if date}
                    <small>
                        {date.toLocaleDateString()}
                        {date.toLocaleTimeString()}
                    </small>
                {/if}
            </h3>
            <p>
                {update.body}
            </p>
            <div class="actions">
                <button on:click={screen.handle.pop} class="cancel">
                    キャンセル
                    <i class="ti ti-x"></i>
                </button>
                <button on:click={() => (open = true)} class="update">
                    アップデート
                    <i class="ti ti-arrow-right"></i>
                    <Popup bind:isOpen={open}>
                        <div class="confirm">
                            <small>アップデートを開始しますか？</small>
                            <button on:click={applyUpdate}>はい！</button>
                        </div>
                    </Popup>
                </button>
            </div>
        </div>
    {/if}
</Screen>

<style lang="scss">
    .info {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        height: 100%;
        padding: 1rem;
        border-radius: 0.5rem;
        color: var(--color-1);
    }

    hr {
        width: 100%;
        margin: 0.5rem 0;
        border: none;
        border-top: 1px solid var(--color-1);
    }

    small {
        display: block;
        font-size: 0.7rem;
        color: var(--color-1);
    }

    .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    button {
        padding: 0.5rem 1rem;
        outline: 1px solid var(--color-1);
        border: none;
        background: var(--color-1);
        color: var(--color-bg-1);
        font-weight: 600;
        cursor: pointer;

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
        }
    }

    .cancel {
        background: none;
        outline: none;
        color: var(--color-1);

        &:hover {
            background: var(--color-bg-1);
            color: var(--color-1);
            outline: 1px solid var(--color-1);
        }
    }

    .confirm {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
        background: var(--color-bg-2);
        color: var(--color-1);
    }
</style>
