import re

import iwashi
from omu import Address, App, Omu
from omu.app import AppType
from omu.extension.permission import PermissionType
from omu_chat.chat import (
    AUTHOR_TABLE,
    CHANNEL_TABLE,
    CREATE_CHANNEL_TREE_ENDPOINT,
    IDENTIFIER,
    MESSAGE_TABLE,
    PROVIDER_TABLE,
    REACTION_SIGNAL,
    ROOM_TABLE,
    VOTE_TABLE,
)
from omu_chat.model.channel import Channel
from omu_chat.permissions import (
    CHAT_CHANNEL_TREE_PERMISSION_ID,
    CHAT_PERMISSION_ID,
    CHAT_REACTION_PERMISSION_ID,
    CHAT_READ_PERMISSION_ID,
    CHAT_SEND_PERMISSION_ID,
    CHAT_WRITE_PERMISSION_ID,
)

from .version import VERSION

app = App(
    id=IDENTIFIER,
    version=VERSION,
    type=AppType.PLUGIN,
)
address = Address("127.0.0.1", 26423)
client = Omu(app, address=address)

client.permissions.register(
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
        id=CHAT_REACTION_PERMISSION_ID,
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


messages = client.tables.get(MESSAGE_TABLE)
messages.set_config({"cache_size": 1000})
authors = client.tables.get(AUTHOR_TABLE)
authors.set_config({"cache_size": 500})
channels = client.tables.get(CHANNEL_TABLE)
providers = client.tables.get(PROVIDER_TABLE)
rooms = client.tables.get(ROOM_TABLE)
votes = client.tables.get(VOTE_TABLE)
reaction_signal = client.signals.get(REACTION_SIGNAL)


@client.endpoints.bind(endpoint_type=CREATE_CHANNEL_TREE_ENDPOINT)
async def create_channel_tree(url: str) -> list[Channel]:
    results = await iwashi.tree(url)
    if results is None:
        return []
    found_channels: dict[str, Channel] = {}
    services = await providers.fetch_all()
    for result in results.to_list():
        for provider in services.values():
            if re.search(provider.regex, result.url) is None:
                continue
            found_channels[result.id] = Channel(
                provider_id=provider.id,
                id=provider.id / result.id,
                name=result.name or result.id or result.service.name,
                description=result.description or "",
                icon_url=result.profile_picture or "",
                url=result.url,
                active=True,
            )
    return list(found_channels.values())
