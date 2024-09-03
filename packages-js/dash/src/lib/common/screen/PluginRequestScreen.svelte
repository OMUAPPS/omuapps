<script lang="ts">
    import type { PluginRequestPacket } from '@omujs/omu/extension/dashboard/packets.js';
    import { FlexColWrapper, FlexRowWrapper } from '@omujs/ui';
    import AppInfo from '../AppInfo.svelte';
    import PackageEntry from './PackageEntry.svelte';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: PluginRequestPacket;
            resolve: (accept: boolean) => void;
        };
    };
    const { request, resolve } = screen.props;

    function accept() {
        resolve(true);
        screen.handle.pop();
    }

    function reject() {
        resolve(false);
        screen.handle.pop();
    }
</script>

<Screen {screen} title="plugin_request" disableClose>
    <FlexColWrapper heightFull between widthFull>
        <span class="text">
            <AppInfo app={request.app} />
            は以下のパッケージのインストールを要求しています。
        </span>
        <div class="permissions">
            {#each request.packages as entry}
                <PackageEntry {entry} />
            {/each}
        </div>
        <FlexRowWrapper widthFull between baseline>
            <button on:click={reject} class="reject">
                拒否
                <i class="ti ti-x" />
            </button>
            <button on:click={accept} class="accept">
                許可
                <i class="ti ti-check" />
            </button>
        </FlexRowWrapper>
    </FlexColWrapper>
</Screen>

<style lang="scss">
    button {
        padding: 8px 14px;
        margin-right: 1px;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-1);
        cursor: pointer;
        background: var(--color-bg-2);
        border: none;
        outline: none;
        outline-offset: -1px;
    }

    .text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 20px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-1);
    }

    .permissions {
        width: 100%;
        overflow-y: auto;
    }

    .accept {
        color: var(--color-bg-2);
        background: var(--color-1);

        &:hover {
            outline: 1px solid var(--color-bg-2);
        }
    }

    .reject {
        margin-left: auto;
        outline: 1px solid var(--color-1);

        &:hover {
            outline-offset: -2px;
        }
    }
</style>
