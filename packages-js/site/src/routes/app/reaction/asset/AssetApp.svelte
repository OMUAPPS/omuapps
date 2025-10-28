<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import type { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import ReactionRenderer from '../components/ReactionRenderer.svelte';
    import { ReactionApp } from '../reaction-app';

    export let omu: Omu;
    const chat = Chat.create(omu);
    const reactionApp = new ReactionApp(omu, chat);

    if (BROWSER) {
        omu.permissions.require(ChatPermissions.CHAT_REACTION_PERMISSION_ID);
        omu.start();
    }
</script>

<ReactionRenderer {omu} {reactionApp} />
