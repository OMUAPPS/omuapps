<script lang="ts">
    import Section from '$lib/components/Section.svelte';
    import { ARC4 } from '$lib/random.js';
    import type { Models } from '@omujs/chat';
    import {
        Author,
        type Component,
        Message,
        Provider,
        Room,
        type Root,
    } from '@omujs/chat/models';
    import { AppHeader, AppPage, Button, MessageEntry, MessageRenderer, Slider, TableList } from '@omujs/ui';
    import { APP } from './app.js';
    import { chat, omu } from './client.js';
    import ComponentEditor from './components/ComponentEditor.svelte';

    let component: Root = $state({
        type: 'root',
        data: [
        ],
    });

    function reset() {
        component = {
            type: 'root',
            data: [
            ],
        };
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

    const AUTHORS = [
        new Author({
            providerId: TEST_PROVIDER.id,
            id: TEST_PROVIDER.id.join('hal'),
            avatarUrl: 'https://picsum.photos/seed/0/200/200',
            name: 'Hal',
        }),
        new Author({
            providerId: TEST_PROVIDER.id,
            id: TEST_PROVIDER.id.join('aqu-A'),
            avatarUrl: 'https://picsum.photos/seed/1/200/200',
            name: 'aqu-A',
        }),
        new Author({
            providerId: TEST_PROVIDER.id,
            id: TEST_PROVIDER.id.join('loibo'),
            avatarUrl: 'https://picsum.photos/seed/2/200/200',
            name: 'loibo',
        }),
        new Author({
            providerId: TEST_PROVIDER.id,
            id: TEST_PROVIDER.id.join('tell-I'),
            avatarUrl: 'https://picsum.photos/seed/3/200/200',
            name: 'tell-I',
        }),
    ];

    const rng = ARC4.fromNumber(Date.now());

    function getContent(): Component {
        if (component.data.length) return component;
        const contents = [
            'あっ狐飛んだ',
            '犬起きて',
            '犬寝てる…？',
            '狐が飛んでる',
            '飛んだ！！',
            'とんだ',
            'とんだ！',
            '犬ｗｗｗ 全く起きる気配なくて草🐶💤',
            'キツネさん、身体能力高すぎ！🦊💨',
        ];
        return {
            type: 'root',
            data: [
                { type: 'text', data: rng.choice(contents) },
            ],
        };
    }

    function send() {
        const author = rng.choice(AUTHORS);
        chat.authors.add(author);
        const room = new Room({
            id: TEST_PROVIDER.id.join('test-room'),
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
                content: getContent(),
                authorId: author.id,
                createdAt: new Date(),
            }),
        );
    }

    let interval: number = $state(1000);
    let intervalHandle: number | undefined = $state();

    const filter = (_: string, message: Models.Message) => message.deleted !== true;

    const sort = (a: Models.Message) => {
        if (!a.createdAt) return 0;
        return a.createdAt.getTime();
    };

    $effect(() => {
        if (intervalHandle) {
            clearInterval(intervalHandle);
            intervalHandle = window.setInterval(() => {
                send();
            }, interval);
        }
    });
</script>

<AppPage>
    {#snippet header()}
        <header>
            <AppHeader app={APP} />
        </header>
    {/snippet}
    <main>
        <div class="left">
            <Section name="操作" icon="ti-rocket">
                <label>
                    <span>リセット</span>
                    <Button primary onclick={reset}>
                        リセット
                        <i class="ti ti-reload"></i>
                    </Button>
                </label>
                <label>
                    <span>テスト</span>
                    <Button primary onclick={send}>
                        テスト
                        <i class="ti ti-send"></i>
                    </Button>
                </label>
                <label>
                    <span>自動</span>
                    <Button primary={!intervalHandle} onclick={() => {
                        clearInterval(intervalHandle);
                        if (intervalHandle) {
                            intervalHandle = undefined;
                        } else {
                            intervalHandle = window.setInterval(() => {
                                send();
                            }, interval);
                        }
                    }}>
                        {#if intervalHandle}
                            停止
                            <i class="ti ti-square"></i>
                        {:else}
                            開始
                            <i class="ti ti-player-play"></i>
                        {/if}
                    </Button>
                </label>
                <label>
                    間隔
                    <Slider bind:value={interval} min={100} max={10000} step={100} unit="ms" />
                </label>
            </Section>
            <Section name="内容">
                <div class="flex width gap between">
                    <div class="editor">
                        <ComponentEditor bind:component remove={reset} />
                    </div>
                </div>
            </Section>
        </div>
        <div class="preview">
            <Section name="プレビュー">
                <MessageRenderer content={component} />
            </Section>
            <Section name="JSON">
                <textarea
                    cols="30"
                    onchange={(event) => {
                        component = JSON.parse(event.currentTarget.value);
                    }}
                >{JSON.stringify(component, null, 2)}</textarea>
            </Section>
        </div>
        <div class="chat">
            <Section name="チャット">
                <div class="list">
                    <TableList
                        table={chat.messages}
                        {filter}
                        {sort}
                        reverse={true}
                    >
                        {#snippet component({ entry, selected })}
                            <MessageEntry {entry} {selected} />
                        {/snippet}
                    </TableList>
                </div>
            </Section>
        </div>
    </main>
</AppPage>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: stretch;
        justify-content: flex-start;
        background: var(--color-bg-1);
        margin: 1rem;
        gap: 1rem;
    }

    .left {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
    }

    label {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
    }

    .preview {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
        flex: 1;
    }

    .chat {
        width: 24rem;
        height: 100%;
        background: var(--color-bg-2);
        position: relative;
    }

    .list {
        position: absolute;
        inset: 0;
        top: 3.5rem;
    }

    textarea {
        height: 10rem;
        border-radius: 2px;
        border: 1px solid var(--color-1);
        color: var(--color-text);
        padding: 0.5rem;
        font-size: 0.8rem;
        font-family: 'Courier New', Courier, monospace;
        resize: vertical;
    }
</style>
