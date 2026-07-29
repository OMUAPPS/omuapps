from __future__ import annotations

import asyncio
from dataclasses import dataclass

from loguru import logger
from omu.identifier import Identifier
from omu_chat import Channel

from .service import ProviderContext, ProviderService


@dataclass
class ChannelState:
    channel: Channel
    active: bool
    revision: int = 0
    task: asyncio.Task[None] | None = None


class ChannelController:
    def __init__(
        self,
        ctx: ProviderContext,
        services: dict[Identifier, ProviderService],
    ) -> None:
        self._ctx = ctx
        self._services = services
        self._states: dict[Identifier, ChannelState] = {}
        ctx.bind_channel_active(self.is_active)

    def is_active(self, channel_id: Identifier) -> bool:
        state = self._states.get(channel_id)
        return state is not None and state.active

    async def update(self, channel: Channel) -> None:
        state = self._states.get(channel.id)
        if state is None:
            state = ChannelState(channel=channel, active=channel.active)
            self._states[channel.id] = state
        else:
            state.channel = channel
            state.active = channel.active
            state.revision += 1
        await self._request(state)

    async def remove(self, channel: Channel) -> None:
        state = self._states.get(channel.id)
        if state is None:
            state = ChannelState(channel=channel, active=False)
            self._states[channel.id] = state
        else:
            state.channel = channel
            state.active = False
            state.revision += 1
        await self._request(state)

    async def bootstrap(self, channels: dict[str, Channel]) -> None:
        current_ids = {channel.id for channel in channels.values()}
        removed = [
            self.remove(state.channel)
            for channel_id, state in tuple(self._states.items())
            if channel_id not in current_ids
        ]
        updated = [self.update(channel) for channel in channels.values()]
        await asyncio.gather(*removed, *updated)

    async def refresh(self) -> None:
        states = [state for state in tuple(self._states.values()) if state.active]
        for state in states:
            state.revision += 1
        await asyncio.gather(*(self._request(state) for state in states))

    async def _request(self, state: ChannelState) -> None:
        if state.task is None or state.task.done():
            state.task = asyncio.create_task(self._run(state))
        await state.task

    async def _run(self, state: ChannelState) -> None:
        while True:
            revision = state.revision
            channel = state.channel
            active = state.active
            service = self._services.get(channel.provider_id)
            if service is None:
                logger.warning(f"Provider {channel.provider_id} not found for channel {channel.key()}")
            else:
                try:
                    if active:
                        await service.start_channel(self._ctx, channel)
                    else:
                        await service.stop_channel(self._ctx, channel)
                except Exception as e:
                    action = "starting" if active else "stopping"
                    logger.opt(exception=e).error(f"Error {action} channel {channel.key()}")
            if revision == state.revision:
                return
