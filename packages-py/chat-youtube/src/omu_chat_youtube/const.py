from omu_chat.model import Provider
from omu_chatprovider.chatprovider import BASE_PROVIDER_IDENTIFIER
from omu_chatprovider.helper import HTTP_REGEX

YOUTUBE_IDENTIFIER = BASE_PROVIDER_IDENTIFIER / "youtube"
YOUTUBE_URL = "https://www.youtube.com"
YOUTUBE_REGEX = (
    HTTP_REGEX + r"(youtu\.be\/(?P<video_id_short>[\w-]+))|(m\.)?youtube\.com\/"
    r"(watch\?v=(?P<video_id>[\w_-]+|)|@(?P<channel_id_vanity>[^/]+|)"
    r"|channel\/(?P<channel_id>[^/]+|)|user\/(?P<channel_id_user>[^/]+|)"
    r"|c\/(?P<channel_id_c>[^/]+|))"
)
PROVIDER = Provider(
    id=YOUTUBE_IDENTIFIER,
    url="youtube.com",
    name="Youtube",
    version="0.1.0",
    repository_url="https://github.com/OMUAPPS/omuapps-python/tree/master/packages/plugin-provider/src/omu_chatprovider/services/youtube",
    regex=YOUTUBE_REGEX,
)
BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " "(KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    )
}
BASE_PAYLOAD = {
    "context": {
        "client": {
            "clientName": "WEB",
            "clientVersion": "2.20240416.05.00",
        }
    }
}
