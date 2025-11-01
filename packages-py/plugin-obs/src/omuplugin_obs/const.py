from omu.app import App
from omu.identifier import Identifier

from omuplugin_obs.version import VERSION

PLUGIN_ID = Identifier.from_key("com.omuapps:plugin-obs")
PLUGIN_APP = App(
    PLUGIN_ID,
    version=VERSION,
    metadata={
        "locale": "en",
        "name": {
            "ja": "OBSプラグイン",
            "en": "OBS Plugin",
        },
        "description": {
            "ja": "アプリがOBSを制御するためのプラグイン",
            "en": "Plugin for app to control OBS",
        },
    },
)
