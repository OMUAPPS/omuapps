<script context="module" lang="ts">
    const REPLY_CACHE: Record<string, string> = {};
</script>
<script lang="ts">
    import { Button, Spinner, Tooltip } from '@omujs/ui';
    import { DOM, type MarshmallowAPI, type Message, type MessageAction } from '../api';
    import { MarshmallowApp } from '../marshmallow-app';
    import { hasPremium } from '../stores';

    export let api: MarshmallowAPI;
    export let message: Message;

    const { omu } = MarshmallowApp.getInstance();

    let recognizing = false;
    let speaking = false;
    omu.dashboard.speechRecognition.listen((status) => {
        if (!recognizing) return;
        switch (status.type) {
            case 'final':{
                const results = status.segments.map(({ transcript }) => transcript).join();
                reply.value += results;
                saveReply();
                break;
            }
            case 'audio_started':{
                speaking = true;
                break;
            }
            case 'audio_ended':{
                speaking = false;
                break;
            }
        }
    });
    let detail: {
        type: 'initializing';
    } | {
        type: 'fetching';
        id: string;
    } | {
        type: 'failed';
        id: string;
    } | {
        type: 'ok';
        id: string;
        answer: MessageAction | undefined;
        actions: MessageAction[];
        tweetURL: string;
    } = { type: 'initializing' };

    async function updateActions() {
        if (detail.type !== 'initializing') return;
        detail = { type: 'fetching', id: message.id };
        try {
            const newActions = await api.messageActions({ id: message.id });
            const answer = newActions.find(action => action.action === 'answers');
            const actions = newActions.filter(action => action.action !== 'answers');
            const tweetURL = new URL('https://x.com/intent/tweet');
            tweetURL.searchParams.set('related', 'marshmallow_qa,diver_down_llc');
            tweetURL.searchParams.set('text', `${reply.value}\n#マシュマロを投げ合おう https://marshmallow-qa.com/messages/${message.id}?utm_medium=twitter&utm_source=answer`);
            detail = {
                type: 'ok',
                id: message.id,
                answer,
                actions,
                tweetURL: tweetURL.toString(),
            };
        } catch (e) {
            console.error(e);
            detail = { type: 'failed', id: message.id };
        }
    }

    async function refresh() {
        detail = { type: 'initializing' };
        await updateActions();
    }

    updateActions();

    let reply = {
        value: '',
        id: '',
    };

    function restoreReply() {
        reply.value = REPLY_CACHE[message.id] ?? '';
        reply.id = message.id;
    }

    function saveReply() {
        REPLY_CACHE[reply.id] = reply.value;
    }

    $: {
        if (reply.id !== message.id) {
            restoreReply();
        }
    }
    $: if (message?.reply) {
        reply.value = DOM.blockToString(message.reply);
        reply.id = message.id;
    };

    type ActionTranslation = { name: string; icon?: string; remove: boolean };
    function getActionTranslation(action: MessageAction): ActionTranslation {
        const method = action.options.has('_method');
        const ACTIONS: Record<string, ActionTranslation | undefined> = {
            like: {
                name: 'お気に入り',
                icon: 'ti-heart',
                remove: true,
            },
            acknowledgement: {
                name: '確認済みにする',
                icon: 'ti-check',
                remove: true,
            },
        };
        const DELETE_ACTIONS: Record<string, ActionTranslation | undefined> = {
            like: {
                name: 'お気に入りから外す',
                icon: 'ti-heart-off',
                remove: false,
            },
            acknowledgement: {
                name: '未確認にする',
                icon: 'ti-check',
                remove: false,
            },
        };
        return (method ? DELETE_ACTIONS[action.action] : ACTIONS[action.action]) ?? {
            name: action.action,
            remove: true,
        };
    }

    $: replyEnable = !detail || !!message.reply || detail?.type !== 'ok' || !detail.answer;
</script>

<div class="reply">
    <div class="textarea">
        <textarea bind:value={reply.value} on:change={saveReply} disabled={!!message.reply}></textarea>
        <div class="overlay">
            {#if recognizing}
                <div class="recognizing">
                    {#if speaking}
                        認識中
                        <Spinner />
                    {:else}
                        待機中
                    {/if}
                </div>
            {/if}
        </div>
    </div>
    <div class="actions">
        {#if detail.type === 'ok'}
            {#each detail.actions as action, index(index)}
                {@const { name, icon, remove } = getActionTranslation(action)}
                <Button primary={remove} onclick={async () => {
                    await action.submit(api, {});
                    refresh();
                }} let:promise>
                    {#if promise}
                        <Spinner />
                    {:else}
                        <i class="ti {icon}"></i>
                        {#if icon}
                            <Tooltip>
                                {name}
                            </Tooltip>
                        {:else}
                            {name}
                        {/if}
                    {/if}
                </Button>
            {/each}
            <Button primary={!recognizing} disabled={replyEnable || !$hasPremium} onclick={() => {
                recognizing = !recognizing;
                omu.dashboard.requestSpeechRecognition();
            }}>
                {#if $hasPremium}
                    {#if recognizing}
                        音声認識を停止
                    {:else}
                        音声認識を開始
                    {/if}
                {:else}
                    <Tooltip>
                        マシュマロのプレミアムに加入することで音声認識で入力することできます
                    </Tooltip>
                {/if}
                {#if recognizing}
                    <i class="ti ti-player-pause"></i>
                {:else}
                    <i class="ti ti-bubble-text"></i>
                {/if}
            </Button>
            {#if message.reply}
                <a href={detail.tweetURL} target="_blank">
                    Xで投稿
                    <i class="ti ti-external-link"></i>
                </a>
            {:else}
                <Button primary disabled={!reply.value || replyEnable} onclick={async () => {
                    recognizing = false;
                    if (!message) throw new Error('No message selected');
                    if (detail?.type !== 'ok') throw new Error('No answer action available');
                    if (!detail?.answer) throw new Error('No answer action available');
                    await detail.answer.submit(api, {
                        'answer[content]': reply.value,
                        'answer[skip_tweet_confirmation]': 'on',
                        'answer[publish_method]': 'web_share_api',
                    });
                    message.reply = { type: 'text', body: reply.value };
                    delete REPLY_CACHE[reply.id];
                }}>
                    {#if !!message.reply}
                        <Tooltip>すでに返信しています</Tooltip>
                    {:else if !reply.value}
                        <Tooltip>返信内容を入力してください</Tooltip>
                    {:else if detail?.type !== 'ok'}
                        <Tooltip>アクションを取得中...</Tooltip>
                    {:else if !detail?.answer}
                        <Tooltip>返信アクションが利用できません</Tooltip>
                    {/if}
                    返信
                    <i class="ti ti-message-circle"></i>
                </Button>
            {/if}
        {:else if detail.type === 'fetching'}
            <Button disabled><Spinner /></Button>
        {/if}
    </div>
</div>

<style lang="scss">
    .reply {
        position: relative;
        display: flex;
        flex-direction: column-reverse;
        gap: 1rem;
        width: 22rem;
        position: sticky;
        top: 0;
        bottom: 10%;
        padding-bottom: 10%;
        height: 100%;
    }

    .actions {
        display: flex;
        align-items: stretch;
        justify-content: flex-end;
        gap: 0.75rem;
        height: 2.5rem;

        > a {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            height: 2.25rem;
            text-decoration: none;
            padding: 0 0.75rem;
            white-space: nowrap;
            background: var(--color-1);
            color: var(--color-bg-1);
            font-size: 0.8rem;
            border-radius: 2px;
        }
    }

    .textarea {
        position: relative;
        width: 100%;
        height: 100%;

        > textarea {
            position: unset;
            outline: none;
            border: none;
            width: 100%;
            height: 100%;
            padding: 0.5rem;
            outline: 1px solid var(--color-outline);
            border-radius: 2px;

            &:focus {
                outline: 1px solid var(--color-1);
            }
        }
    }

    .recognizing {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: var(--color-1);
        font-size: 1.5rem;
        border: 2px solid var(--color-1);
        animation: pulse 1.621s infinite;
        pointer-events: none;
    }

    @keyframes pulse {
        0% {
            inset: -0.5rem;
            border-radius: 3px;
            border-color: color-mix(in srgb, var(--color-1) 100%, transparent 0%);
        }
        50% {
            inset: -0.25rem;
            border-radius: 3px;
            border-color: color-mix(in srgb, var(--color-1) 1%, transparent 0%);
        }
        100% {
            inset: -0.5rem;
            border-radius: 3px;
            border-color: color-mix(in srgb, var(--color-1) 100%, transparent 0%);
        }
    }
</style>
