from omu.extension.permission.permission import PermissionType

from .const import PLUGIN_ID

DISCORDRPC_VC_READ_PERMISSION_ID = PLUGIN_ID / "vc" / "read"
DISCORDRPC_VC_READ_PERMISSION_TYPE = PermissionType(
    DISCORDRPC_VC_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "ボイスチャンネル情報の読み取り",
            "en": "Read voice channel",
        },
        "note": {
            "ja": "誰が居て誰が喋っているかを知るために使われます",
            "en": "Used to know who is in the voice channel and who is speaking",
        },
    },
)
DISCORDRPC_VC_SET_PERMISSION_ID = PLUGIN_ID / "vc" / "set"
DISCORDRPC_VC_SET_PERMISSION_TYPE = PermissionType(
    DISCORDRPC_VC_SET_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "読み取るボイスチャンネルを設定",
            "en": "Set voice channel to read",
        },
    },
)
DISCORDRPC_GUILD_READ_PERMISSION_ID = PLUGIN_ID / "guild" / "read"
DISCORDRPC_GUILD_READ_PERMISSION_TYPE = PermissionType(
    DISCORDRPC_GUILD_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "サーバー情報の読み取り",
            "en": "Read guild",
        },
        "note": {
            "ja": "入っているサーバーを知るために使われます",
            "en": "Used to know the guild you are in",
        },
    },
)
DISCORDRPC_CHANNEL_READ_PERMISSION_ID = PLUGIN_ID / "channel" / "read"
DISCORDRPC_CHANNEL_READ_PERMISSION_TYPE = PermissionType(
    DISCORDRPC_CHANNEL_READ_PERMISSION_ID,
    {
        "level": "low",
        "name": {
            "ja": "チャンネル情報の読み取り",
            "en": "Read channel",
        },
        "note": {
            "ja": "入っているチャンネルを知るために使われます",
            "en": "Used to know the channel you are in",
        },
    },
)
