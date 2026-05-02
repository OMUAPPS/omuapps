from omu.identifier import Identifier
from omu_chat.model import Provider
from omu_chatprovider.helper import HTTP_REGEX

from .version import VERSION

PROVIDER_ID = Identifier.from_key("com.omuapps:chatprovider/picarto")
PROVIDER = Provider(
    id=PROVIDER_ID,
    url="picarto.tv",
    name="Picarto",
    version=VERSION,
    repository_url="https://github.com/OMUAPPS/omuapps/tree/develop/packages-py/chat-picarto",
    regex=HTTP_REGEX + r"picarto\.tv\/(?P<id>[\w=-]+)",
)
BASE_HEADERS = {"User-Agent": f"OMUAPPS-Picarto/{VERSION}"}
