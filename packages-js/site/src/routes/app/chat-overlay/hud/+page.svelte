<script lang="ts">
    import { Chat, ChatPermissions } from '@omujs/chat';
    import { Omu, OmuPermissions } from '@omujs/omu';
    import { setGlobal } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { HUD_APP } from '../app.js';
    import { ChatOverlayApp } from '../chat-app.js';
    import HUD from './HUD.svelte';

    const omu = new Omu(HUD_APP);
    const chat = Chat.create(omu);
    new ChatOverlayApp(omu, chat);
    setGlobal({ omu, chat });

    if (BROWSER) {
        omu.permissions.require(
            OmuPermissions.I18N_GET_LOCALES_PERMISSION_ID,
            OmuPermissions.REGISTRY_PERMISSION_ID,
            OmuPermissions.ASSET_PERMISSION_ID,
            ChatPermissions.CHAT_PERMISSION_ID,
        );
        omu.start();
    }
</script>

<HUD />
