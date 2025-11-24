<script lang="ts">
    import { Button, Checkbox, Combobox, Textbox } from '@omujs/ui';
    import type { Answer } from '../../quiz-app';

    interface Props {
        answer: Answer;
    }

    let { answer = $bindable() }: Props = $props();

    function addChoice(index?: number) {
        if (answer.type !== 'choices') return;
        const newChoice = { text: '', answer: answer.choices.length === 0 };
        if (index === undefined) {
            answer.choices = [
                ...answer.choices,
                newChoice,
            ];
        } else {
            const before = answer.choices.slice(0, index + 1);
            const after = answer.choices.slice(index + 1, answer.choices.length);
            answer.choices = [
                ...before,
                newChoice,
                ...after,
            ];
        }
    }
</script>

<Combobox options={{
    choices: {
        label: '選択肢',
        value: { type: 'choices', choices: [], randomize: false },
    },
}} bind:value={answer} key={answer.type} />
{#if answer.type === 'choices'}
    <div class="choices">
        <small>
            ランダム化
            <Checkbox bind:value={answer.randomize} />
        </small>
        <Button onclick={addChoice} primary>
            追加
        </Button>
        {#each answer.choices as choice, index (index)}
            <div class="choice">
                <small>正解</small>
                <Checkbox bind:value={answer.choices[index].answer} />
                <Textbox bind:value={choice.text} placeholder="選択肢 {index + 1}" submit={() => addChoice(index)} />
                <Button onclick={() => {
                    if (answer.type !== 'choices') return;
                    answer.choices = answer.choices.filter((_, it) => it !== index);
                }} primary>
                    削除
                </Button>
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .choices {
        display: flex;
        flex-direction: column;
        margin-top: 1rem;
        gap: 0.5rem;
    }

    .choice {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
    }
</style>
