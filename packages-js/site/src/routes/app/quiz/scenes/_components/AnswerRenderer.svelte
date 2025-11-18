<script lang="ts">
    import type { Answer, QuestionState } from '../../quiz-app';

    export let answer: Answer;
    export let state: QuestionState = { type: 'idle' };
</script>

{#if answer.type === 'choices'}
    <div class="choices" style:grid-template-columns="repeat({Math.max(Math.min(2, answer.choices.length), Math.ceil(Math.sqrt(answer.choices.length)))}, 1fr)">
        {#each answer.choices as choice, index (index)}
            <div class="choice">
                {#if state.type === 'qustioning' || state.type === 'answering'}
                    <div class="choice-content" style:animation-delay="{0.621 + (index) * 0.0621}s">
                        <small>
                            <strong>{index + 1}</strong>
                            <small>と答えて回答</small>
                        </small>
                        <p>{choice.text}</p>
                    </div>
                {/if}
                <div
                    class="answer"
                    class:show={state.type === 'answering'}
                    style:background={choice.answer ? '#e44' : '#44e'}
                    style:animation-delay="{(index) * 0.0621}s"
                >
                    {#if choice.answer}
                        <i class="ti ti-circle"></i>
                    {:else}
                        <i class="ti ti-x"></i>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .choices {
        display: grid;
        gap: 4em;
    }

    .choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        text-align: center;
        height: 5em;
        font-size: 2em;
    }

    .answer {
        position: absolute;
        right: -0.75em;
        top: -0.75em;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1em;
        min-height: 1.5em;
        height: 1.5em;
        min-width: 1.5em;
        width: 1.5em;
        color: #fff;
        border-radius: 100%;
        opacity: 0;

        &.show {
            animation: slide 0.3621s forwards;
        }
    }

    @keyframes slide {
        0% {
            transform: translateY(30px);
            opacity: 0;
        }
        40% {
            transform: translateY(-4px);
            opacity: 0.76;
        }

        100% {
            transform: translateY(0px);
            opacity: 1;
        }
    }

    .choice-content {
        animation: slide-content 0.3105s forwards;
        opacity: 0;
        background: var(--color-bg-2);
        padding: 0.5em 1em;
        width: 100%;

        > small {
            font-size: 0.621em;
            border-bottom: 2px solid #000;
            padding-bottom: 0.0621em;
            margin-bottom: 0.0621em;
            opacity: 0.95;
            width: 100%;
            display: block;
        }
    }

    @keyframes slide-content {
        0% {
            transform: translateX(10px);
            opacity: 0;
            clip-path: rect(0% 0% 100% 0%);
        }
        40% {
            opacity: 0.76;
        }

        100% {
            transform: translateX(0px);
            opacity: 1;
            clip-path: rect(0% 100% 100% 0%);
        }
    }
</style>
