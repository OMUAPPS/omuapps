from omu import App, Identifier

from .version import VERSION

PLUGIN_ID = Identifier.from_key("com.omuapps:plugin-discordrpc")
PLUGIN_APP = App(
    PLUGIN_ID,
    version=VERSION,
    metadata={
        "locale": "ja",
        "name": {
            "ja-JP": "Discord RPCプラグイン",
            "en-US": "Discord RPC Plugin",
        },
    },
)

DISCORD_CLIENT_ID = 207646673902501888