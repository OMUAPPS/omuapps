from __future__ import annotations

import asyncio
import socket
import threading
import time
from dataclasses import dataclass, field

from loguru import logger
from omu.omu import Omu

from .const import PLUGIN_APP, PORT_MAX, PORT_MIN
from .discordrpc import DiscordRPC
from .discordrpc.payloads import (
    AuthenticateUser,
    GetChannelsResponseData,
    GetGuildsResponseData,
    SpeakingStartData,
    SpeakingStopData,
    VoiceChannelSelect,
    VoiceStateItem,
)
from .permissions import (
    DISCORDRPC_CHANNELS_READ_PERMISSION_TYPE,
    DISCORDRPC_VC_READ_PERMISSION_TYPE,
    DISCORDRPC_VC_SET_PERMISSION_TYPE,
)
from .types import (
    GET_CHANNELS_ENDPOINT_TYPE,
    GET_CLIENTS_ENDPOINT_TYPE,
    GET_GUILDS_ENDPOINT_TYPE,
    REFRESH_ENDPOINT_TYPE,
    SELECTED_VOICE_CHANNEL_REGISTRY_TYPE,
    SESSION_REGISTRY_TYPE,
    SET_VC_ENDPOINT_TYPE,
    SPEAKING_STATE_REGISTRY_TYPE,
    VOICE_STATE_REGISTRY_TYPE,
    WAIT_FOR_READY_ENDPOINT_TYPE,
    GetChannelsRequest,
    GetGuildsRequest,
    SetVCRequest,
    SpeakState,
)

omu = Omu(PLUGIN_APP)
omu.permissions.register(
    DISCORDRPC_VC_READ_PERMISSION_TYPE,
    DISCORDRPC_VC_SET_PERMISSION_TYPE,
    DISCORDRPC_CHANNELS_READ_PERMISSION_TYPE,
)
voice_state_registry = omu.registries.get(VOICE_STATE_REGISTRY_TYPE)
speaking_state_registry = omu.registries.get(SPEAKING_STATE_REGISTRY_TYPE)
session_registry = omu.registries.get(SESSION_REGISTRY_TYPE)
selected_vc_channel_registry = omu.registries.get(SELECTED_VOICE_CHANNEL_REGISTRY_TYPE)


@dataclass
class Client:
    port: int
    rpc: DiscordRPC
    user: AuthenticateUser
    access_token: str
    closed: bool = False
    vc_rpc: DiscordRPC | None = None
    guild_id: str | None = None
    channel_id: str | None = None
    vc_states: dict[str, VoiceStateItem] = field(default_factory=dict)
    speaking_states: dict[str, SpeakState] = field(default_factory=dict)

    @classmethod
    async def try_connect(cls, port: int) -> Client:
        sessions = await session_registry.get()
        session_key = f"{port}"
        exist_session = sessions["sessions"].get(session_key, None)
        if exist_session:
            rpc = await DiscordRPC.connect(port)
            try:
                authenticate_res = await rpc.authenticate(exist_session["access_token"])
                return cls(
                    port,
                    rpc,
                    authenticate_res["user"],
                    exist_session["access_token"],
                )
            except Exception as e:
                logger.warning(f"Failed to connect with existing session: {e}")
                sessions["sessions"].pop(session_key)
                await session_registry.set(sessions)
        rpc = await DiscordRPC.connect(port)
        authorize_res = await rpc.authorize(["rpc", "messages.read"])
        access_token = await rpc.fetch_access_token(authorize_res["code"])
        sessions["sessions"][session_key] = {"access_token": access_token}
        await session_registry.set(sessions)
        authenticate_res = await rpc.authenticate(access_token)
        return cls(
            port,
            rpc,
            authenticate_res["user"],
            access_token,
        )

    async def start(self):
        await self.rpc.subscribe_voice_channel_select(
            guild_id=None,
            channel_id=None,
            handler=self._handle_voice_channel_change,
        )
        session = await session_registry.get()
        if session["user_id"] != self.user["id"]:
            return
        if session["guild_id"] and session["channel_id"]:
            await self._connect_vc(session["guild_id"], session["channel_id"])
        else:
            selected_vc = await self.rpc.get_selected_voice_channel()
            if selected_vc is None:
                await self.stop()
                return
            if not await self.is_channel_match(selected_vc.get("guild_id"), selected_vc["id"]):
                return
            await self._connect_vc(selected_vc["guild_id"], selected_vc["id"])

    async def _handle_voice_channel_change(self, vc: VoiceChannelSelect):
        session = await session_registry.get()
        if session["user_id"] != self.user["id"]:
            return
        channel_id = vc["channel_id"]
        guild_id = vc.get("guild_id")
        if channel_id is None:
            is_selected_guild = self.guild_id == session["guild_id"]
            is_selected_channel = self.channel_id == session["channel_id"]
            channel_filter_present = session["guild_id"] and session["channel_id"]
            if channel_filter_present and is_selected_channel:
                return
            if channel_filter_present and session["guild_id"] and is_selected_guild:
                return
            await self.stop()
        else:
            if not await self.is_channel_match(guild_id, channel_id):
                return
            await self._connect_vc(guild_id, channel_id)

    async def is_channel_match(self, guild_id: str | None, channel_id: str) -> bool:
        session = await session_registry.get()
        if session["guild_id"] and guild_id and session["guild_id"] != guild_id:
            return False
        if session["guild_id"] and session["channel_id"] and session["channel_id"] != channel_id:
            return False
        if guild_id:
            channels = await self.get_channels(guild_id)
            if not any(channel["id"] == channel_id for channel in channels["channels"]):
                return False
        return True

    async def get_guilds(self) -> GetGuildsResponseData:
        return await self.rpc.get_guilds()

    async def get_channels(self, guild_id: str) -> GetChannelsResponseData:
        return await self.rpc.get_channels(guild_id)

    async def _connect_vc(
        self,
        guild_id: str | None,
        channel_id: str,
    ):
        logger.info(f"Connecting to voice channel {channel_id}")
        self.guild_id = guild_id
        self.channel_id = channel_id
        session = await session_registry.get()
        if session["guild_id"] and session["channel_id"] and channel_id != session["channel_id"]:
            return
        channel = await self.rpc.get_channel(channel_id)
        if channel is None:
            logger.warning(f"Voice channel {channel_id} not found")
            return
        guild = await self.rpc.get_guild(channel["guild_id"]) if channel["guild_id"] else None
        await selected_vc_channel_registry.set(
            {
                "guild": guild,
                "channel": channel,
            }
        )
        if self.vc_rpc is not None:
            await self.vc_rpc.close()
        self.vc_rpc = await DiscordRPC.connect(self.port)
        await self.vc_rpc.authenticate(self.access_token)
        vc_states: dict[str, VoiceStateItem] = {}
        speaking_states: dict[str, SpeakState] = {}
        await voice_state_registry.set(vc_states)
        await speaking_state_registry.set(speaking_states)

        async def voice_state_create(data: VoiceStateItem):
            vc_states[data["user"]["id"]] = data
            await voice_state_registry.set(vc_states)

        async def voice_state_update(data: VoiceStateItem):
            vc_states[data["user"]["id"]] = data
            await voice_state_registry.set(vc_states)

        async def voice_state_delete(data: VoiceStateItem):
            vc_states.pop(data["user"]["id"], None)
            await voice_state_registry.set(vc_states)

        await self.vc_rpc.subscribe_voice_state_create(channel_id, voice_state_create)
        await self.vc_rpc.subscribe_voice_state_update(channel_id, voice_state_update)
        await self.vc_rpc.subscribe_voice_state_delete(channel_id, voice_state_delete)

        async def speaking_start_handler(data: SpeakingStartData):
            existing = speaking_states.get(data["user_id"], {})
            speaking_states[data["user_id"]] = {
                "speaking": True,
                "speaking_start": int(time.time() * 1000),
                "speaking_stop": existing.get("speaking_stop", 0),
            }
            await speaking_state_registry.set(speaking_states)

        await self.vc_rpc.subscribe_speaking_start(channel_id, speaking_start_handler)

        async def speaking_stop_handler(data: SpeakingStopData):
            existing = speaking_states.get(data["user_id"], {})
            speaking_states[data["user_id"]] = {
                "speaking": False,
                "speaking_start": existing.get("speaking_start", 0),
                "speaking_stop": int(time.time() * 1000),
            }
            await speaking_state_registry.set(speaking_states)

        await self.vc_rpc.subscribe_speaking_stop(channel_id, speaking_stop_handler)

    async def stop(self):
        if self.vc_rpc is not None:
            await self.vc_rpc.close()
            self.vc_rpc = None
        await voice_state_registry.set({})
        await speaking_state_registry.set({})
        await selected_vc_channel_registry.set(None)

    async def close(self):
        await self.rpc.close()
        if self.vc_rpc is not None:
            await self.vc_rpc.close()


clients: dict[str, Client] = {}
current_client: Client | None = None


@omu.endpoints.bind(endpoint_type=GET_CLIENTS_ENDPOINT_TYPE)
async def get_clients(_: None) -> dict[str, AuthenticateUser]:
    return {port: client.user for port, client in clients.items()}


@omu.endpoints.bind(endpoint_type=GET_GUILDS_ENDPOINT_TYPE)
async def get_guilds(req: GetGuildsRequest) -> GetGuildsResponseData:
    user_id = req["user_id"]
    if user_id not in clients:
        raise Exception(f"User {user_id} not found. {clients.keys()}")
    client = clients[user_id]
    guilds = await client.get_guilds()
    return guilds


@omu.endpoints.bind(endpoint_type=GET_CHANNELS_ENDPOINT_TYPE)
async def get_channels(req: GetChannelsRequest) -> GetChannelsResponseData:
    user_id = req["user_id"]
    if user_id not in clients:
        raise Exception(f"User {user_id} not found. {clients.keys()}")
    client = clients[user_id]
    return await client.get_channels(req["guild_id"])


@omu.endpoints.bind(endpoint_type=SET_VC_ENDPOINT_TYPE)
async def set_vc(req: SetVCRequest) -> None:
    global current_client
    session = await session_registry.get()
    session["user_id"] = req["user_id"]
    session["guild_id"] = req["guild_id"]
    session["channel_id"] = req["channel_id"]
    await session_registry.set(session)

    if current_client is not None:
        await current_client.stop()
    user_id = req["user_id"]
    if user_id not in clients:
        raise Exception(f"User {user_id} not found. {clients.keys()}")
    client = clients[user_id]
    current_client = client
    await client.start()
    return None


refresh_task: asyncio.Task | None = None


@omu.endpoints.bind(endpoint_type=WAIT_FOR_READY_ENDPOINT_TYPE)
async def wait_for_vc(_: None) -> None:
    if refresh_task is None:
        return
    await refresh_task


def is_port_open(port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex(("127.0.0.1", port))
    sock.close()
    return result == 0


async def retrieve_open_ports() -> asyncio.Future[list[int]]:
    future = asyncio.Future()

    def retrieve():
        open_ports: list[int] = []

        def check_port(port: int):
            if is_port_open(port):
                open_ports.append(port)

        threads = [threading.Thread(target=check_port, args=(port,)) for port in range(PORT_MIN, PORT_MAX)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        future.set_result(open_ports)

    threading.Thread(target=retrieve).start()
    return await future


async def refresh_clients():
    PARALLEL = True
    try:
        await shutdown_clients()

        async def connect_client(port: int):
            try:
                client = await Client.try_connect(port)
                clients[client.user["id"]] = client
                logger.info(f"Connected to {port}")
            except Exception as e:
                logger.warning(f"Failed to connect to {port}: {e}")

        open_ports = await retrieve_open_ports()
        if PARALLEL:
            tasks = [connect_client(port) for port in open_ports]
            await asyncio.gather(*tasks)
        else:
            for port in open_ports:
                await connect_client(port)

        session = await session_registry.get()
        user_id = session["user_id"]
        if user_id not in clients:
            return
        client = clients[user_id]
        await client.start()
    finally:
        global refresh_task
        refresh_task = None


async def shutdown_clients():
    for client in clients.values():
        await client.close()
    clients.clear()


@omu.endpoints.bind(endpoint_type=REFRESH_ENDPOINT_TYPE)
async def refresh(_: None) -> None:
    global refresh_task
    if refresh_task is not None:
        refresh_task.cancel()
    refresh_task = asyncio.create_task(refresh_clients())
    await refresh_task


@omu.on_ready
async def on_ready():
    global refresh_task
    await voice_state_registry.set({})
    await speaking_state_registry.set({})
    if refresh_task is not None:
        refresh_task.cancel()
    refresh_task = asyncio.create_task(refresh_clients())


@omu.event.stopped.listen
async def on_stop():
    for client in clients.values():
        await client.close()
