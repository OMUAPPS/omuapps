<script lang="ts">
    import { Button, ExternalLink } from '@omujs/ui';
    import type { ScreenHandle } from './screen.js';
    import Screen from './Screen.svelte';

    interface Props {
        handle: ScreenHandle;
        props: {
            resolve: (accept: boolean) => void;
        };
    }

    let { handle, props }: Props = $props();
    const { resolve } = props;

    function accept() {
        resolve(true);
        handle.pop();
    }

    function reject() {
        resolve(false);
        handle.pop();
    }
</script>

<Screen {handle}>
    <div class="screen">
        <h2>音声認識を使用します</h2>
        <small>
            これには<ExternalLink href="https://cloud.google.com/speech-to-text">Google Cloud</ExternalLink>もしくは<ExternalLink href="https://azure.microsoft.com/ja-jp/products/ai-services/ai-speech">Azure</ExternalLink>の音声認識サービスに音声が送信されます。
        </small>
        <small>
            設定から再び無効にすることができます
        </small>
        <div class="actions">
            <Button onclick={reject}>
                キャンセル
            </Button>
            <Button primary onclick={accept}>
                許可
            </Button>
        </div>
    </div>
</Screen>

<style lang="scss">
    .screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        padding: 7rem 2.5rem;
        color: var(--color-text);
        font-weight: 600;
        font-size: 1rem;
        height: 100%;
    }

    h2 {
        color: var(--color-1);
    }

    .actions {
        display: flex;
        gap: 0.5rem;
    }
</style>
