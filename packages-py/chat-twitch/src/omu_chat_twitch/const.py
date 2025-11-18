from omu.identifier import Identifier
from omu_chat.model import Provider
from omu_chatprovider.helper import HTTP_REGEX

from .version import VERSION

PROVIDER_ID = Identifier.from_key("com.omuapps:chatprovider/twitch")
PROVIDER = Provider(
    id=PROVIDER_ID,
    url="twitch.tv",
    name="Twitch",
    version=VERSION,
    repository_url="https://github.com/OMUAPPS/omuapps/tree/develop/packages-py/chat-twitch",
    regex=HTTP_REGEX + r"twitch\.tv\/(?P<id>[\w=-]+)",
)
BASE_HEADERS = {"User-Agent": f"OMUAPPS-Twitch/{VERSION}"}
