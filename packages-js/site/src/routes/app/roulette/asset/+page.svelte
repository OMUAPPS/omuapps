<script lang="ts">
    import { page } from '$app/stores';
    import AssetPage from '$lib/components/AssetPage.svelte';
    import '@fontsource/rocknroll-one';
    import { Chat } from '@omujs/chat';
    import { Message } from '@omujs/chat/models/message.js';
    import { App, Omu } from '@omujs/omu';
    import { ComponentRenderer, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP_ID } from '../app.js';
    import RouletteRenderer from '../components/RouletteRenderer.svelte';
    import { RouletteApp } from '../roulette-app.js';

    let assetId = BROWSER && $page.url.searchParams.get('assetId');
    const id = assetId || Date.now().toString();
    const ASSET_APP = new App(APP_ID.join('asset', id), {
        version: '0.1.0',
    });
    const omu = new Omu(ASSET_APP);
    const chat = new Chat(omu);
    const roulette = new RouletteApp(omu);
    const { state } = roulette;
    setClient(omu);

    if (BROWSER) {
        omu.start();
    }
</script>

<AssetPage>
    <main class:end={$state.type === 'spin-result'}>
        <div class="roulette">
            <RouletteRenderer {roulette} />
        </div>
        {#if $state.type === 'spin-result'}
            {@const message =
                $state.result.entry.message && Message.fromJson($state.result.entry.message)}
            <div class="result-container">
                <div class="result">
                    <p>
                        {$state.result.entry.name}
                    </p>
                    {#if message && message.authorId}
                        <div class="message">
                            {#await chat.authors.get(message.authorId.key()) then author}
                                <div class="author">
                                    <img src={author?.avatarUrl} alt="icon" />
                                    <span class="shadow">{author?.name}</span>
                                    <span>{author?.name}</span>
                                </div>
                                {#if message.content}
                                    <span class="content">
                                        <ComponentRenderer component={message.content} />
                                    </span>
                                {/if}
                            {/await}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </main>
</AssetPage>

<style lang="scss">
    main {
        position: fixed;
        inset: 0;
    }

    :global(body) {
        background: transparent !important;
    }

    .roulette {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    .result-container {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100;
    }

    .result {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: #fff;

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
            padding: 1rem;
            gap: 1rem;

            .author {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;

                > span {
                    position: absolute;
                    top: 100%;
                    transform: translate(0, -50%);
                    font-weight: 900;
                    font-size: 1.2rem;
                    color: #000;
                    white-space: nowrap;

                    &.shadow {
                        -webkit-text-stroke: 0.15rem #fff;
                    }
                }
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
            transform: scale(0.98);
        }
        22% {
            transform: scale(1.23);
        }
        100% {
            transform: scale(1.2);
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
            transform: scale(0.63);
            opacity: 0.7;
        }
        100% {
            transform: scale(0.65);
            opacity: 0.73;
        }
    }
</style>
