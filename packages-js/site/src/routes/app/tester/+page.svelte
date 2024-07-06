<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { type Component } from '@omujs/chat/models/content.js';
    import { Author, Message, Provider, Room, content } from '@omujs/chat/models/index.js';
    import { AppHeader, FlexColWrapper, FlexRowWrapper, MessageRenderer } from '@omujs/ui';
    import { APP } from './app.js';
    import { chat, omu } from './client.js';
    import ComponentEditor from './components/ComponentEditor.svelte';

    let component: Component = new content.Root([
        new content.Text('Hello, World!'),
        new content.Text('This is a test.'),
    ]);

    function reset() {
        component = new content.Root([
            new content.Text('Hello, World!'),
            new content.Text('This is a test.'),
        ]);
    }

    const TEST_PROVIDER = new Provider({
        id: omu.app.id,
        description: 'test',
        name: 'test',
        regex: '(?!x)x',
        repository_url: 'https://github.com/OMUAPPS/omuapps',
        url: 'https://example.com',
        version: '0.0.1',
    });

    function send() {
        const authorName = `test-author-${Date.now()}`;
        const authorIcon = `https://picsum.photos/seed/${Date.now()}/200/200`;
        const author = new Author({
            providerId: TEST_PROVIDER.id,
            id: TEST_PROVIDER.id.join(`${Date.now()}`),
            name: authorName,
            avatarUrl: authorIcon,
        });
        chat.authors.add(author);
        const room = new Room({
            id: TEST_PROVIDER.id.join(`${Date.now()}`),
            connected: false,
            createdAt: new Date(),
            providerId: TEST_PROVIDER.id,
            metadata: {},
            status: 'offline',
        });
        chat.rooms.update(room);
        chat.messages.add(
            new Message({
                roomId: room.id,
                id: room.id.join(`${Date.now()}`),
                content: component,
                authorId: author.id,
                createdAt: new Date(),
            }),
        );
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        <section>
            <FlexRowWrapper gap>
                <button on:click={reset}>
                    <i class="ti ti-reload" />
                    Reset
                </button>
                <button on:click={send}>
                    <i class="ti ti-send" />
                    Send
                </button>
            </FlexRowWrapper>
        </section>
        <h3>
            <i class="ti ti-eye" />
            Preview
        </h3>
        <section class="fill">
            <MessageRenderer bind:content={component} />
        </section>
        <h3>
            <i class="ti ti-pencil" />
            Content
        </h3>
        <section>
            <FlexRowWrapper widthFull gap between>
                <FlexColWrapper widthFull heightFull>
                    <small>INPUT</small>
                    <div class="editor">
                        <ComponentEditor bind:component remove={reset} />
                    </div>
                </FlexColWrapper>
                <FlexColWrapper widthFull heightFull>
                    <small>JSON</small>
                    <pre>{JSON.stringify(content.serialize(component), null, 4)}</pre>
                </FlexColWrapper>
            </FlexRowWrapper>
        </section>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        height: 100vh;
        background: var(--color-bg-1);
        padding: 40px;
    }

    h3 {
        color: var(--color-1);
        margin-bottom: 10px;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: start;
        justify-content: flex-start;
        width: 100%;
        padding: 0px;
        margin-bottom: 20px;

        &.fill {
            background: var(--color-bg-2);
            padding: 10px;
        }
    }

    small {
        color: var(--color-1);
    }

    .editor {
        background: var(--color-bg-2);
        width: 100%;
        height: 100%;
        padding: 5px;
    }

    pre {
        background: var(--color-bg-2);
        width: 100%;
        white-space: pre-wrap;
        overflow: auto;
        font-size: 12px;
        padding: 5px;
    }

    button {
        background: none;
        border: none;
        cursor: pointer;
        margin: 0;
        height: 30px;
        padding: 10px;
        display: flex;
        font-size: 14px;
        align-items: center;
        justify-content: center;
        color: var(--color-1);
        background: var(--color-bg-2);
        outline: 1px solid var(--color-1);
        outline-offset: -1px;
        border-radius: 4px;

        &:hover {
            background: var(--color-bg-1);
        }

        &:active {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
    }
</style>
