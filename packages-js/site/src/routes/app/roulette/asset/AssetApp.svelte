<script lang="ts">
    import { Chat, Models } from '@omujs/chat';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { ComponentRenderer } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import RouletteRenderer from '../components/RouletteRenderer.svelte';
    import { RouletteApp } from '../roulette-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const chat = Chat.create(omu);
    const roulette = new RouletteApp(omu);
    const { rouletteState } = roulette;

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
        );
        omu.start();
    }
</script>
<main class:end={$rouletteState.type === 'spin-result'}>
    <div class="roulette">
        <RouletteRenderer {roulette} />
    </div>
    {#if $rouletteState.type === 'spin-result'}
        {@const message = $rouletteState.result.entry.message && Models.Message.deserialize($rouletteState.result.entry.message)}
        <div class="result-container">
            <div class="result">
                <p>
                    {$rouletteState.result.entry.name}
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
            transform: scale(0.43);
            opacity: 0.2;
        }
        100% {
            transform: scale(0.45);
            opacity: 0.23;
        }
    }
</style>
