<script lang="ts">
    import { installed } from '../settings.js';

    import Screen from '$lib/common/screen/Screen.svelte';
    import { type ScreenHandle } from '$lib/common/screen/screen.js';
    import { t } from '$lib/i18n/i18n-context.js';

    export let screen: {
        handle: ScreenHandle;
        props: {};
    };

    function finish() {
        screen.handle.pop();
        $installed = true;
    }
</script>

<Screen {screen} title="setup" disableClose>
    <div class="container">
        <p>
            {$t('setup.app_hint')}
        </p>
        <a
            href="https://omuapps.com/app"
            class="site-link"
            target="_blank"
            rel="noopener noreferrer"
        >
            omuapps.com/app
            <i class="ti ti-external-link" />
        </a>
        <button on:click={finish}>
            {$t('setup.finish')}
            <i class="ti ti-check" />
        </button>
    </div>
</Screen>

<style lang="scss">
    .container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-text);
        font-weight: bold;
    }

    p {
        font-size: 1rem;
        color: var(--color-text);
        margin-bottom: 1rem;
    }

    a {
        font-size: 0.9rem;
    }

    button {
        position: absolute;
        bottom: 2rem;
        margin-top: 1rem;
        padding: 0 1.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        border: none;
        background: var(--color-bg-1);
        outline: 1px solid var(--color-1);
        color: var(--color-1);
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;

        > i {
            margin-left: 0.25rem;
        }

        &:hover {
            background: var(--color-1);
            color: var(--color-bg-1);
            transition-duration: 0.0621s;
        }
    }
</style>
