import asyncio
import time

from aiohttp import ClientSession
from omu.omu import Omu

from .const import DISCORD_CLIENT_ID, PLUGIN_APP
from .discordrpc import DiscordRPC
from .discordrpc.payloads import SpeakingStartData, SpeakingStopData, VoiceStateItem
from .types import SPEAKING_STATE_REGISTRY_TYPE, VOICE_STATE_REGISTRY_TYPE, SpeakState

omu = Omu(PLUGIN_APP)
voice_state_registry = omu.registries.get(VOICE_STATE_REGISTRY_TYPE)
speaking_state_registry = omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE)


@omu.on_ready
async def on_ready():
    asyncio.create_task(start())


async def start():
    async with ClientSession(
        headers={
            "accept": "*/*",
            "accept-language": "ja",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "origin": "https://streamkit.discord.com",
            "pragma": "no-cache",
            "referer": "https://streamkit.discord.com/overlay",
            "user-agent": "OMUAPPS Streamkit Overlay/1.0.0",
        },
    ) as session:
        ws = await session.ws_connect(
            f"ws://127.0.0.1:6463/?v=1&client_id={DISCORD_CLIENT_ID}",
            autoping=False,
        )
        rpc = DiscordRPC(session, ws)
        msg = await rpc.receive()
        print(msg)
        listen = asyncio.create_task(rpc.start())
        res = await rpc.authorize(["rpc", "messages.read"])
        res = await rpc.authenticate(res["code"])

        vc_states: dict[str, VoiceStateItem] = {}
        speaking_states: dict[str, SpeakState] = {}

        async def voice_state_create(data: VoiceStateItem):
            vc_states[data["user"]["id"]] = data
            await voice_state_registry.set(vc_states)

        async def voice_state_update(data: VoiceStateItem):
            vc_states[data["user"]["id"]] = data
            await voice_state_registry.set(vc_states)

        async def voice_state_delete(data: VoiceStateItem):
            vc_states.pop(data["user"]["id"], None)
            await voice_state_registry.set(vc_states)

        channel_id = "943738949518639118"
        await rpc.subscribe_voice_state_create(channel_id, voice_state_create)
        await rpc.subscribe_voice_state_update(channel_id, voice_state_update)
        await rpc.subscribe_voice_state_delete(channel_id, voice_state_delete)

        async def speaking_start_handler(data: SpeakingStartData):
            existing = speaking_states.get(data["user_id"], {})
            speaking_states[data["user_id"]] = {
                "speaking": True,
                "speaking_start": int(time.time() * 1000),
                "speaking_stop": existing.get("speaking_stop", 0),
            }
            await speaking_state_registry.set(speaking_states)

        await rpc.subscribe_speaking_start(channel_id, speaking_start_handler)

        async def speaking_stop_handler(data: SpeakingStopData):
            existing = speaking_states.get(data["user_id"], {})
            speaking_states[data["user_id"]] = {
                "speaking": False,
                "speaking_start": existing.get("speaking_start", 0),
                "speaking_stop": int(time.time() * 1000),
            }
            await speaking_state_registry.set(speaking_states)

        await rpc.subscribe_speaking_stop(channel_id, speaking_stop_handler)

        await listen
