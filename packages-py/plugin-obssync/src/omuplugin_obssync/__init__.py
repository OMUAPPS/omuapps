from omu import Plugin

from .plugin import on_start_server
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


plugin = Plugin(
    on_start_server=on_start_server,
)
