<script lang='ts'>
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { CommentCounter } from '../counter.js';

    let { omu }: { omu: Omu } = $props();
    const counter = new CommentCounter(omu, Chat.create(omu));

    if (BROWSER) {
        omu.permissions.require(
            ChatPermissions.CHAT_PERMISSION_ID,
            OmuPermissions.TABLE_PERMISSION_ID,
        );
        omu.start();
        omu.onReady(() => counter.initialize());
    }
</script>

<main>
    <strong>{counter.total.toLocaleString()}</strong>
</main>

<style>
    :global(body) {
        overflow: hidden;
        background: transparent !important;
    }

    main {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        container-type: inline-size;
    }

    strong {
        color: white;
        font-size: clamp(4rem, 45cqw, 15rem);
        line-height: 1;
        font-variant-numeric: tabular-nums;
        -webkit-text-stroke: 0.04em black;
        paint-order: stroke fill;
    }
</style>
