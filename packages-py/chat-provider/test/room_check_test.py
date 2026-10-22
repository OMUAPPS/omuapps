from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from omu_chatprovider import chatprovider
from omu_chatprovider.errors import ProviderTemporarilyUnavailable


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "outcome,expected",
    [
        (True, False),
        (False, True),
        (ProviderTemporarilyUnavailable("503"), False),
        (RuntimeError("other provider"), True),
    ],
)
async def test_room_check_retains_unknown_connections_and_existing_other_behavior(outcome, expected):
    room = SimpleNamespace(channel_id=None, key=lambda: "test:room")
    check = AsyncMock(side_effect=outcome) if isinstance(outcome, Exception) else AsyncMock(return_value=outcome)
    assert await chatprovider.should_remove(room, SimpleNamespace(is_online=check)) is expected


@pytest.mark.asyncio
async def test_inactive_channel_is_removed_without_checking_provider(monkeypatch):
    monkeypatch.setattr(chatprovider.controller, "is_active", lambda _: False)
    check = AsyncMock(side_effect=ProviderTemporarilyUnavailable("503"))
    room = SimpleNamespace(channel_id="channel")
    assert await chatprovider.should_remove(room, SimpleNamespace(is_online=check))
    check.assert_not_awaited()
