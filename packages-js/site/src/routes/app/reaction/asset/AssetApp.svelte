<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import ReactionRenderer from '../components/ReactionRenderer.svelte';
    import { ReactionApp } from '../reaction-app';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const chat = Chat.create(omu);
    const reactionApp = new ReactionApp(omu, chat);

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            ChatPermissions.CHAT_REACTION_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<ReactionRenderer {omu} {reactionApp} />
