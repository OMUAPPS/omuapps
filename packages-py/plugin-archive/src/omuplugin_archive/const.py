from pathlib import Path

import yt_dlp.version
from omu.app import App, AppType
from omu.identifier import Identifier

from .archive import ArchiveConfig
from .version import VERSION

IDENTIFIER = Identifier.from_key("com.omuapps:archive/plugin")
APP = App(
    id=IDENTIFIER,
    version=VERSION,
    type=AppType.PLUGIN,
)

# yt-dlp <url> --live-from-start --wait-for-video 60 --write-thumbnail --write-info-json --write-description --write-annotations --write-sub
# --live-from-start   - Start the stream from the beginning
# --wait-for-video    - Wait for video
# --write-thumbnail   - Write thumbnail image
# --write-info-json   - Write video metadata
# --write-description - Write video description
# --write-annotations - Write video annotations
# --write-sub         - Write video subtitles
# -P "C:/MyVideos"    - Save the video to the specified directory
YTDLP_OPTIONS = {
    "live_from_start": True,
    "wait_for_video": [60, 60],
    "writethumbnail": True,
    "writeinfojson": True,
    "writedescription": True,
    "writeannotations": True,
    # "writesubtitles": True,
}

DEFAULT_CONFIG = ArchiveConfig(
    active=False,
    yt_dlp_info={
        "version": yt_dlp.version.__version__,
        "git_head": yt_dlp.version.RELEASE_GIT_HEAD,
        "variant": yt_dlp.version.VARIANT,
        "update_hint": yt_dlp.version.UPDATE_HINT,
        "channel": yt_dlp.version.CHANNEL,
        "origin": yt_dlp.version.ORIGIN,
    },
    yt_dlp_options=YTDLP_OPTIONS,
    output_dir=str(Path.home() / "Videos" / "omuapps.com" / "archive"),
    archive_limit={
        "size_mb": 1024 * 16,
        "count": 100,
        "duration_days": 30,
    },
)
