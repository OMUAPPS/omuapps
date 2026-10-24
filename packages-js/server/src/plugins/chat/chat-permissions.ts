import { ChatPermissions as Ids } from '@omujs/chat';
import { PermissionType } from '@omujs/omu/api/permission';

export class ChatPermissions {
    public static readonly ALL: readonly PermissionType[] = [
        new PermissionType({
            id: Ids.CHAT_PERMISSION_ID,
            metadata: {
                level: 'medium',
                name: { ja: 'チャット', en: 'Chat data' },
                note: { ja: '配信の情報を使うために使われます', en: 'Used to use chat' },
            },
        }),
        new PermissionType({
            id: Ids.CHAT_READ_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'チャットの読み取り', en: 'Read chat' },
                note: { ja: '配信の情報を読み取るだけに使われます', en: 'Used to read chat data' },
            },
        }),
        new PermissionType({
            id: Ids.CHAT_WRITE_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'チャットの書き込み', en: 'Write chat' },
                note: { ja: '配信の情報を書き込むために使われます', en: 'Used to write chat data' },
            },
        }),
        new PermissionType({
            id: Ids.CHAT_SEND_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'チャットの送信', en: 'Send chat' },
                note: { ja: 'メッセージを追加するために使われます', en: 'Used to add messages' },
            },
        }),
        new PermissionType({
            id: Ids.CHAT_CHANNEL_TREE_PERMISSION_ID,
            metadata: {
                level: 'medium',
                name: { ja: 'チャンネルツリーの取得', en: 'Create channel tree' },
                note: { ja: '指定されたURLに関連すると思われるチャンネルをすべて取得するために使われます', en: 'Get all channels related to the specified URL' },
            },
        }),
        new PermissionType({
            id: Ids.CHAT_REACTION_PERMISSION_ID,
            metadata: {
                level: 'low',
                name: { ja: 'リアクション', en: 'Reaction' },
                note: { ja: 'リアクションを取得するために使われます', en: 'Used to get reactions' },
            },
        }),
    ];
}
