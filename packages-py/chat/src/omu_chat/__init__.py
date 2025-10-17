from omu import Plugin
from omu.api.permission import PermissionType
from omu.plugin import InstallContext, StartContext

from omu_chat.permissions import (
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    CHAT_PERMISSION_ID,
    CHAT_REACTION_PERMISSION_ID,
    CHAT_READ_PERMISSION_ID,
    CHAT_SEND_PERMISSION_ID,
    CHAT_WRITE_PERMISSION_ID,
)

from . import permissions
from .chat import Chat
from .event.event_types import events
from .model import (
    Author,
    Channel,
    Gift,
    Message,
    Paid,
    Provider,
    Role,
    Room,
    content,
)
from .version import VERSION

__version__ = VERSION
__all__ = [
    "permissions",
    "Chat",
    "Author",
    "Channel",
    "content",
    "events",
    "Gift",
    "Message",
    "Paid",
    "Provider",
    "Role",
    "Room",
    "plugin",
]


def get_client():
    from .plugin import client

    return client


async def install(ctx: InstallContext | StartContext):
    ctx.server.security.register_permission(
        PermissionType(
            CHAT_PERMISSION_ID,
            metadata={
                "level": "medium",
                "name": {
                    "ja": "チャット",
                    "en": "Chat data",
                },
                "note": {
                    "ja": "配信の情報を使うために使われます",
                    "en": "Used to use chat",
                },
            },
        ),
        PermissionType(
            CHAT_READ_PERMISSION_ID,
            metadata={
                "level": "low",
                "name": {
                    "ja": "チャットの読み取り",
                    "en": "Read chat",
                },
                "note": {
                    "ja": "配信の情報を読み取るだけに使われます",
                    "en": "Used to read chat data",
                },
            },
        ),
        PermissionType(
            CHAT_WRITE_PERMISSION_ID,
            metadata={
                "level": "low",
                "name": {
                    "ja": "チャットの書き込み",
                    "en": "Write chat",
                },
                "note": {
                    "ja": "配信の情報を書き込むために使われます",
                    "en": "Used to write chat data",
                },
            },
        ),
        PermissionType(
            CHAT_SEND_PERMISSION_ID,
            metadata={
                "level": "low",
                "name": {
                    "ja": "チャットの送信",
                    "en": "Send chat",
                },
                "note": {
                    "ja": "メッセージを追加するために使われます",
                    "en": "Used to add messages",
                },
            },
        ),
        PermissionType(
            CHAT_CHANNEL_TREE_PERMISSION_ID,
            metadata={
                "level": "medium",
                "name": {
                    "ja": "チャンネルツリーの取得",
                    "en": "Create channel tree",
                },
                "note": {
                    "ja": "指定されたURLに関連すると思われるチャンネルをすべて取得するために使われます",
                    "en": "Get all channels related to the specified URL",
                },
            },
        ),
        PermissionType(
            CHAT_REACTION_PERMISSION_ID,
            metadata={
                "level": "low",
                "name": {
                    "ja": "リアクション",
                    "en": "Reaction",
                },
                "note": {
                    "ja": "リアクションを取得するために使われます",
                    "en": "Used to get reactions",
                },
            },
        ),
    )


plugin = Plugin(
    get_client,
    on_start=install,
    on_install=install,
)
