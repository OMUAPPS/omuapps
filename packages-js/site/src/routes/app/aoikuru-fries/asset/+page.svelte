<script lang="ts">
    import AssetPage from '$lib/components/AssetPage.svelte';
    import '@fontsource/rocknroll-one';
    import { Chat, events } from '@omujs/chat';
    import type { Message } from '@omujs/chat/models';
    import { content } from '@omujs/chat/models';
    import { App, Omu } from '@omujs/omu';
    import { setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import { FriesApp } from '../fries-app.js';
    import { type ThrowData } from '../state.js';
    import Avatar from './Avatar.svelte';
    import Board from './Board.svelte';
    import Fries from './Fries.svelte';
    import bg from './img/bg.png';

    const ASSET_APP = new App(APP_ID.join('asset'), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const chat = Chat.create(omu);
    const friesApp = new FriesApp(omu);
    const { config, state } = friesApp;
    setClient(omu);

    let queue: ThrowData[] = [];

    function processQueue() {
        if ($state.type !== 'idle') return;
        const data = queue.shift();
        if (!data) return;
        $state = {
            type: 'throw_start',
            thrower: data.thrower,
        };
    }

    state.subscribe(() => processQueue());

    function isMessageGreasy(message: Message): boolean {
        if (!message.content) return false;
        for (const component of content.walk(message.content)) {
            if (component.type !== 'image') continue;
            const { id } = component.data;
            if (id === '🍟') return true;
        }
        return false;
    }

    chat.on(events.message.add, async (message) => {
        if (!message.authorId) return;
        if (!isMessageGreasy(message)) return;
        const author = await chat.authors.get(message.authorId.key());
        queue.push({
            thrower: author?.name || '',
        });
        processQueue();
    });

    friesApp.testSignal.listen(() => {
        queue.push({
            thrower: `test${Date.now() % 1000}`,
        });
        processQueue();
    });

    chat.messages.listen();

    if (BROWSER) {
        omu.start();
    }
</script>

<AssetPage>
    <main>
        <img src={bg} alt="" />
        <Board title={$config.text} />
        <Avatar {state} />
        <Fries {state} />

        {#if $config.hint}
            <small class="hint">
                {$config.hint}
            </small>
        {/if}
    </main>
</AssetPage>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    img {
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .hint {
        position: absolute;
        bottom: 24px;
        right: calc(27px * 2);
        font-size: 40px;
        padding: 5px 10px;
        color: #f0ebe0;
        font-family: "RocknRoll One", sans-serif;
        font-weight: 500;
    }

    :global(body) {
        background: transparent !important;
    }
</style>
