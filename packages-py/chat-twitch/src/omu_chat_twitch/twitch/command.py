from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, TypedDict


@dataclass(frozen=True, slots=True)
class Command:
    params: dict[str, str] = field(default_factory=dict)
    arguments: list[list[str]] = field(default_factory=list)

    @classmethod
    def try_parse(cls, data: str) -> Command:
        options: list[list[str]] = []
        params = {}
        if data.startswith(":"):
            data = data[1:]
        parts = data.split(" :")
        if data.startswith("@"):
            params = Command._parse_params(parts.pop(0)[1:])
        options.extend(map(Command._parse_arguments, filter(len, parts)))
        return cls(
            params=params,
            arguments=options,
        )

    @staticmethod
    def _parse_params(data: str) -> dict[str, str]:
        return dict(map(lambda x: x.split("="), filter(len, data.split(";"))))

    @staticmethod
    def _parse_arguments(data: str) -> list[str]:
        return data.split(" ")

    def to_json(self) -> Any:
        return {
            "params": self.params,
            "arguments": self.arguments,
        }


@dataclass(frozen=True, slots=True)
class TwitchCommand:
    params: dict[str, str]
    args: list[list[str]]
    sender: str
    action: str


class Commands:
    @staticmethod
    def CAP(*args: str) -> Command:
        return Command(arguments=[["CAP", "REQ"], list(args)])

    @staticmethod
    def NICK(nick: str) -> Command:
        return Command(arguments=[["NICK", nick]])

    @staticmethod
    def USER(nick: str) -> Command:
        return Command(arguments=[["USER", nick, "8", "*"], [nick]])

    @staticmethod
    def JOIN(room: str) -> Command:
        return Command(arguments=[["JOIN", f"#{room}"]])

    @staticmethod
    def PART(room: str) -> Command:
        return Command(arguments=[["PART", f"#{room}"]])

    @staticmethod
    def PONG() -> Command:
        return Command(arguments=[["PONG"]])


ChatParams = TypedDict(
    "ChatParams",
    {
        "badge-info": str,
        "badges": str,
        "color": str,
        "display-name": str,
        "emotes": str,
        "first-msg": str,
        "flags": str,
        "id": str,
        "mod": str,
        "returning-chatter": str,
        "room-id": str,
        "subscriber": str,
        "tmi-sent-ts": str,
        "turbo": str,
        "user-id": str,
        "user-type": str,
    },
)
RoomStateParams = TypedDict(
    "RoomStateParams",
    {
        "@emote-only": str,
        "followers-only": str,
        "r9k": str,
        "room-id": str,
        "slow": str,
        "subs-only": str,
    },
)
