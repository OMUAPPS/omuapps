import re

import iwashi
from omu import Address, App, Omu
from omu.app import AppType

from .chat import (
    AUTHOR_TABLE,
    CHANNEL_TABLE,
    CREATE_CHANNEL_TREE_ENDPOINT,
    MESSAGE_TABLE,
    PLUGIN_ID,
    PROVIDER_TABLE,
    REACTION_SIGNAL,
    ROOM_TABLE,
    VOTE_TABLE,
)
from .model.channel import Channel
from .version import VERSION

app = App(
    id=PLUGIN_ID,
    version=VERSION,
    type=AppType.PLUGIN,
)
address = Address("127.0.0.1", 26423)
client = Omu(app, address=address)


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
            id = provider.id / result.id
            found_channels[id.key()] = Channel(
                provider_id=provider.id,
                id=id,
                name=result.name or result.id or result.service.name,
                description=result.description or "",
                icon_url=result.profile_picture or "",
                url=result.url,
                active=True,
            )
    return list(found_channels.values())
