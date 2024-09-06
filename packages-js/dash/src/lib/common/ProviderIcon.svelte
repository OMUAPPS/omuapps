<script lang="ts">
    import type { Provider } from '@omujs/chat/models/index.js';

    import type { Identifier } from '@omujs/omu/identifier.js';
    import { chat, omu } from '../client.js';

    export let providerId: Identifier;

    async function getProvider(): Promise<Provider | undefined> {
        const provider = await chat.providers.get(providerId.key());
        return provider;
    }
</script>

<div class="icon">
    {#await getProvider() then provider}
        {#if provider}
            <img
                src={omu.assets.proxy(provider.imageUrl || `https://${provider.url}/favicon.ico`)}
                alt="icon"
                class="provider-icon"
                class:image={provider.imageUrl}
                width="16"
                height="16"
            />
        {/if}
    {/await}
</div>

<style>
    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
    }

    .image {
        width: 32px;
        height: 32px;
    }
</style>
