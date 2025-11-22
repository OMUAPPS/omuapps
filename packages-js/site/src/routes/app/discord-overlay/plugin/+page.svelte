<script lang="ts">
    import { Omu } from '@omujs/omu';
    import { BROWSER } from 'esm-env';
    import { DISCORD_PLUGIN_APP } from '../app';
    import { DiscordRPCService } from './plugin';

    const omu = new Omu(DISCORD_PLUGIN_APP);
    const service = DiscordRPCService.createPlugin(omu);
    const sessions = service.sessions.compatSvelte();
    const voiceStates = service.voiceStates.compatSvelte();
    const speakingStates = service.speakingStates.compatSvelte();
    if (BROWSER) {
        omu.start();
    }

    let networkState = $state('');

    omu.network.event.status.listen((newState) => networkState = JSON.stringify(newState));

</script>

{networkState}
<main>
    <pre>{JSON.stringify($sessions, null, 2)}</pre>
    <pre>{JSON.stringify($voiceStates, null, 2)}</pre>
    <pre>{JSON.stringify($speakingStates, null, 2)}</pre>
</main>
<style lang="scss">
    pre {
        background: var(--color-bg-2);
        margin: 1rem;
        padding: 1rem;
        width: 20rem;
    }

    main {
        display: flex;
    }
</style>
