from omu import App, Identifier
from omu.app import AppType

from .version import VERSION

PLUGIN_ID = Identifier.from_key("com.omuapps:plugin-discordrpc")
PLUGIN_APP = App(
    PLUGIN_ID,
    version=VERSION,
    type=AppType.PLUGIN,
    metadata={
        "locale": "ja",
        "name": {
            "ja-JP": "Discord RPCプラグイン",
            "en-US": "Discord RPC Plugin",
        },
    },
)

DISCORD_CLIENT_ID = 207646673902501888
PORT_MIN = 6463
PORT_MAX = 6473
