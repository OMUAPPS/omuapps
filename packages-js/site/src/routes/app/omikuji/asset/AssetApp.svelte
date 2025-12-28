<script lang="ts">
    import { browser } from '$app/environment';
    import { Chat, ChatEvents, Models } from '@omujs/chat';
    import type { Omu } from '@omujs/omu';
    import { fly } from 'svelte/transition';
    import { OmikujiApp, type Pattern, type Result } from '../omikuji-app';
    import bg_result from './bg_result.svg';
    import test_avatar from './test_avatar.svg';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const { results, config, testSignal } = OmikujiApp.create(omu);
    const chat = Chat.create(omu);

    function pollPattern(message: Models.Message): Pattern {
        const patterns = $config.patterns;
        if (patterns.length === 0) {
            return {
                name: 'デフォルト',
                description: 'デフォルトの説明です。',
                probability: 0,
            };
        }
        const totalProbability = patterns.reduce((sum, pattern) => sum + pattern.probability, 0);
        const rand = Math.random() * totalProbability;
        let cumulativeProbability = 0;
        for (const pattern of patterns) {
            cumulativeProbability += pattern.probability;
            if (rand <= cumulativeProbability) {
                return pattern;
            }
        }
        return patterns[patterns.length - 1];
    }

    chat.on(ChatEvents.Message.Add, async (message) => {
        if (!message.authorId) return;
        if ($config.patterns.length === 0) return;
        const authorId = message.authorId.key();
        const author = await chat.authors.get(authorId);
        if (!author) return;
        const latest = await results.get(authorId);
        if (!latest) {
            const result: Result = {
                author: authorId,
                name: author.name,
                avatar: author.avatarUrl,
                pattern: pollPattern(message),
                timestamp: message.createdAt.getTime(),
            };
            await results.add(result);
            queue.push(result);
            pollQueue();
        } else {
            const oldTime = new Date(latest.timestamp);
            const newTime = message.createdAt;
            if (newTime.getFullYear() > oldTime.getFullYear()) {
                latest.timestamp = newTime.getTime();
                const result: Result = {
                    author: authorId,
                    name: author.name,
                    avatar: author.avatarUrl,
                    pattern: pollPattern(message),
                    timestamp: message.createdAt.getTime(),
                };
                await results.update(result);
                queue.push(result);
                pollQueue();
            }
        }
    });

    const queue: Result[] = [];

    async function pollQueue() {
        if (omikujiState.type !== 'idle') return;
        const result = queue.shift();
        if (!result) return;
        await results.add(result);
        omikujiState = { type: 'drawing', result };
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2));
        omikujiState = { type: 'result', result };
        await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
        omikujiState = { type: 'idle' };
        await new Promise((resolve) => setTimeout(resolve, 1000 * 1));
        pollQueue();
    }

    let omikujiState: {
        type: 'idle';
    } | {
        type: 'drawing';
        result: Result;
    } | {
        type: 'result';
        result: Result;
    } = $state({ type: 'idle' });

    testSignal.listen((data) => {
        if ($config.patterns.length === 0) return;
        const pattern = $config.patterns[
            Math.floor(Math.random() * $config.patterns.length)
        ];
        queue.push({
            author: data.author,
            name: data.author,
            avatar: test_avatar,
            pattern,
            timestamp: Date.now(),
        });
        pollQueue();
    });

    if (browser) {
        omu.start();
    }
</script>

{#if omikujiState.type === 'idle'}
{:else}
    <div class="container" transition:fly={{ y: 10, duration: 2000 }}>
        <img src={bg_result} alt="">
        {#if omikujiState.type === 'drawing'}
            <p class="author">
                {#if omikujiState.result.avatar}
                    <img src={omikujiState.result.avatar} alt="">
                {/if}
                {omikujiState.result.name}
            </p>
        {:else if omikujiState.type === 'result'}
            <p class="author">
                {#if omikujiState.result.avatar}
                    <img src={omikujiState.result.avatar} alt="">
                {/if}
                {omikujiState.result.name}
            </p>
            <div class="result">
                <h3 class="name">{omikujiState.result.pattern.name}</h3>
                <p class="description">{omikujiState.result.pattern.description}</p>
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .result {
        position: absolute;
        inset: 0;
        animation: forwards 1s fly;
    }

    @keyframes fly {
        0% {
            transform: translateY(10px);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .author {
        position: absolute;
        left: 50%;
        top: 115px;
        transform: translate(-50%, -50%);
        font-size: 2.5rem;
        color: #FF5E5E;
        white-space: nowrap;
        max-width: 80%;
        display: flex;
        align-items: center;

        > img {
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            vertical-align: middle;
            margin-right: 0.5rem;
        }
    }

    .name {
        position: absolute;
        left: 50%;
        top: 240px;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        color: #FF5E5E;
        white-space: nowrap;
    }

    .description {
        position: absolute;
        top: 300px;
        bottom: 50px;
        text-align: start;
        font-size: 1.75rem;
        color: var(--color-text);
        left: 50%;
        transform: translateX(-50%);
        writing-mode: vertical-rl;
    }
</style>
