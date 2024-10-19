from omu.app import App, AppType
from omu.identifier import Identifier

from .version import VERSION

PLUGIN_ID = Identifier.from_key("com.omuapps:marshmallow/plugin")
APP = App(
    id=PLUGIN_ID,
    type=AppType.PLUGIN,
    version=VERSION,
)
