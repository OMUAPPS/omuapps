<script lang="ts">
    import type { AppInstallRequest } from '@omujs/omu/extension/dashboard/packets.js';
    import { FlexColWrapper, FlexRowWrapper, JustifyBaselineWrapper } from '@omujs/ui';
    import Screen from './Screen.svelte';
    import type { ScreenHandle } from './screen.js';

    export let screen: {
        handle: ScreenHandle;
        props: {
            request: AppInstallRequest;
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
            <FlexRowWrapper>
                <FlexColWrapper>
                    <JustifyBaselineWrapper>
                        <small>
                            {request.app.id.namespace.split('.').reverse().join('.')}
                            <i class="ti ti-slash" />
                        </small>
                        <b>
                            {request.app.id.path.reverse().join('.')}
                        </b>
                        <small>
                            v{request.app.version}
                        </small>
                    </JustifyBaselineWrapper>
                </FlexColWrapper>
            </FlexRowWrapper>
            は以下のパッケージのインストールを要求しています。
        </span>
        <div class="permissions">
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
