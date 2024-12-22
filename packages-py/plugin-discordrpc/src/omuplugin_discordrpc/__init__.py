from omu import Plugin

from .plugin import omu
from .version import VERSION

__version__ = VERSION
__all__ = ["plugin"]


plugin = Plugin(
    get_client=lambda: omu,
)
