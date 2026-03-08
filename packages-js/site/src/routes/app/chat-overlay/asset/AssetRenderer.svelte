<script lang="ts">
    import { ChatEvents, Models } from "@omujs/chat";
    import { ChatOverlayApp } from "../chat-app";
    import ChatRendererDefault from "./compatibility/ChatRendererDefault.svelte";
    import ChatRendererYoutube from "./compatibility/ChatRendererYoutube.svelte";

    let { omu, chat, config } = ChatOverlayApp.getInstance();

    const limit = 20;

    let messages: Models.Message[] = $state([]);

    omu.onReady(async () => {
        const initialMessages = await chat.messages.fetchItems({
            limit,
            backward: true,
        });
        messages = [...initialMessages.values()];
        chat.on(ChatEvents.Message.Add, (message) => {
            if (messages.length > limit) {
                messages.shift();
            }
            messages.push(message);
        });
    });
</script>

{#if $config.asset.type === "default"}
    <ChatRendererDefault {messages} />
{:else if $config.asset.type === "youtube"}
    <ChatRendererYoutube {messages} />
{/if}
<svelte:element this={"style"}>
    {$config.asset.css}
</svelte:element>
