<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { OmuPermissions, type Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { ChatOverlayApp } from '../chat-app';
    import AssetRenderer from './AssetRenderer.svelte';

    interface Props {
        omu: Omu;
    }

    let { omu }: Props = $props();
    const chat = Chat.create(omu);
    new ChatOverlayApp(omu, chat);

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.ASSET_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<AssetRenderer />
