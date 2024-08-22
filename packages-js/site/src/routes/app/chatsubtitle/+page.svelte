<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import { Chat, events } from '@omujs/chat';
    import type { Room } from '@omujs/chat/models/room.js';
    import { Identifier, Omu } from '@omujs/omu';
    import { AppHeader, TableList, setClient } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import { ChatSubtitleApp } from './chatsubtitle-app.js';
    import RoomEntry from './components/RoomEntry.svelte';
    import { createSubtitle } from './stores.js';
    import { AlignType, JustifyType, SubtitleWriter } from './subtitle.js';

    export const omu = new Omu(APP);
    const chatSubtitleApp = new ChatSubtitleApp(omu);
    const { config } = chatSubtitleApp;
    const chat = new Chat(omu);
    setClient(omu);

    function isChatSubCreatable(room: Room): boolean {
        const { metadata } = room;
        if (!metadata.first_message_id || !metadata.last_message_id) return false;
        if (room.status !== 'offline') return false;
        return true;
    }

    let xml = '';

    $createSubtitle = async (room: Room) => {
        const { first_message_id, last_message_id } = room.metadata;
        if (!first_message_id || !last_message_id) return;
        const messages = await chat.messages.fetchRange({
            start: first_message_id,
            end: last_message_id,
        });
        let sortedMessages = [...messages.values()]
            .filter((m) => m.roomId.isEqual(room.id))
            .filter((m) => m.authorId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        sortedMessages = sortedMessages.slice(0, 100);
        console.log(sortedMessages.length);
        const authors = await chat.authors.getMany(
            ...sortedMessages
                .map((m) => m.authorId)
                .filter((a): a is Identifier => a !== undefined)
                .map((a) => a.key()),
        );
        const startTimestamp = new Date(room.metadata.started_at!).getTime();
        const writer = new SubtitleWriter();

        type Content = {
            content: string;
            penId: number;
        };
        type Line = {
            left: Content;
            right: Content;
        };
        const output = new Map<number, Line[]>();

        const lines: Line[] = [];
        const insertLine = (time: Date, ...newLines: Line[]) => {
            lines.splice(0, Math.max(0, lines.length - 10));
            lines.push(...newLines);
            output.set(time.getTime() - startTimestamp, lines.slice());
        };
        // penElement.setAttribute('fs', '2');
        // penElement.setAttribute('fs', '2');
        // penElement.setAttribute('et', '4');
        // penElement.setAttribute('ec', '#3C8AC2');
        const contentPenId = writer.getPenId({
            foreground: '#D0E4F3',
            foregroundOpacity: 1.0,
            backgroundOpacity: 0,
        });
        const bgPenId = writer.getPenId({
            foreground: '#000000',
            foregroundOpacity: 0.0,
            background: '#A8C5DB',
            backgroundOpacity: 1,
        });
        const authorPenId = writer.getPenId({
            foreground: '#ffffff',
            foregroundOpacity: 1.0,
            backgroundOpacity: 0,
        });
        const contentPositionId = writer.getPositionId({
            // align: AlignType.Right,
            align: AlignType.TopLeft,
            x: 15,
            // x: CENTER_X - GAP,
            y: 0,
        });
        const bgPositionId = writer.getPositionId({
            // align: AlignType.Right,
            align: AlignType.TopLeft,
            x: 15,
            // x: CENTER_X - GAP,
            y: 0.001,
        });
        const authorPositionId = writer.getPositionId({
            align: AlignType.TopRight,
            x: 15,
            y: 0,
        });
        const styleId = writer.getStyleId({
            justify: 0,
            padding: 0,
            shadow: 0,
        });
        const authorStyleId = writer.getStyleId({
            justify: JustifyType.Right,
            padding: 0,
            shadow: 0,
        });
        for (const message of sortedMessages) {
            const { content, authorId } = message;
            const author = authorId && authors.get(authorId.key());
            if (!author) continue;
            const line: Line = {
                left: { content: content?.toString() || '', penId: contentPenId },
                right: { content: author.name || '', penId: authorPenId },
            };
            insertLine(message.createdAt, line);
        }

        output.forEach((lines, time) => {
            let leftParts: string[] = [];
            let rightParts: string[] = [];
            let textLength = 19;
            for (const line of lines) {
                let count = 0;
                let parts: string[] = [];
                while (line.left.content.length > count) {
                    parts.push(line.left.content.slice(count, count + textLength));
                    count += textLength;
                }
                leftParts.push(...parts.map((p) => '　' + p));
                rightParts.push('　' + line.right.content);
                rightParts.push(...new Array(Math.max(0, parts.length - 1)).fill('　'));
            }
            leftParts = [
                '　　　　　　　　　　　　　　　　　　　　',
                ...new Array(Math.max(0, 10 - leftParts.length)).fill('　'),
                ...leftParts,
                '　　　　　　　　　　　　　　　　　　　　',
            ];
            const bg = [
                ...new Array(leftParts.length).fill('　　　　　　　　　　　　　　　　　　　　'),
            ];
            rightParts = [
                '　　　　　　　　　',
                ...new Array(Math.max(0, 10 - rightParts.length)).fill('　'),
                ...rightParts,
                '　　　　　　　　　',
            ];
            writer.write(
                time,
                {
                    content: bg.join('\n'),
                    penId: bgPenId,
                    positionId: bgPositionId,
                    styleId: styleId,
                },
                {
                    content: leftParts.join('\n'),
                    penId: contentPenId,
                    positionId: contentPositionId,
                    styleId: styleId,
                },
                {
                    content: rightParts.join('\n'),
                    penId: authorPenId,
                    positionId: authorPositionId,
                    styleId: styleId,
                },
            );
        });

        xml = writer.toXml();
        console.log(xml);
    };

    chat.on(events.room.update, async (room: Room) => {
        if (!$config.auto_generate) return;
        if (!isChatSubCreatable(room)) return;
        if (room.connected) return;
        console.log('Creating chat subtitle for room:', room);
    });

    if (BROWSER) {
        omu.start();
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={APP} />
    </header>
    <main>
        {#if xml}
            <a href="data:text/xml;charset=utf-8,{encodeURIComponent(xml)}" download="subtitle.xml">
                Download Subtitle
            </a>
        {/if}
        <TableList
            table={chat.rooms}
            component={RoomEntry}
            filter={(key, room) =>
                !!(room.metadata.first_message_id && room.metadata.last_message_id)}
        />
    </main>
</AppPage>

<style lang="scss">
    section {
        padding: 1rem;
    }

    main {
        position: absolute;
        inset: 0;
    }
</style>
