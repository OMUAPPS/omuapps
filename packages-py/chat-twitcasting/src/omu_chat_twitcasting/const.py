from omu_chat.model import Provider
from omu_chatprovider.chatprovider import BASE_PROVIDER_IDENTIFIER
from omu_chatprovider.helper import HTTP_REGEX

from .version import VERSION

PROVIDER_ID = BASE_PROVIDER_IDENTIFIER / "twitcasting"
PROVIDER = Provider(
    id=PROVIDER_ID,
    url="https://twitcasting.tv/",
    name="TwitCasting",
    version=VERSION,
    repository_url="https://github.com/OMUAPPS/omuapps-python/tree/master/packages-py/chat-twitcasting",
    regex=HTTP_REGEX + r"twitcasting\.tv/(?P<user_id>[^/]+)",
)
BASE_HEADERS = {"User-Agent": f"OMUAPPS/{VERSION} twitcasting provider"}
