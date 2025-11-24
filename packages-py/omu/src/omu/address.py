from __future__ import annotations

import socket
from dataclasses import dataclass
from typing import NotRequired, TypedDict


def get_lan_ip():
    return socket.gethostbyname(socket.gethostname())


class AddressJSON(TypedDict):
    host: str
    port: int
    hash: NotRequired[str | None]


@dataclass(frozen=True, slots=True)
class Address:
    host: str
    port: int
    secure: bool = False
    hash: str | None = None

    def with_hash(self, hash: str | None):
        return Address(
            host=self.host,
            port=self.port,
            secure=self.secure,
            hash=hash,
        )

    @classmethod
    def default(cls) -> Address:
        return cls(host=get_lan_ip(), port=26423)

    def to_url(self) -> str:
        return f"{'https' if self.secure else 'http'}://{self.host or 'localhost'}:{self.port}"

    def to_json(self) -> AddressJSON:
        return {"host": self.host, "port": self.port, "hash": self.hash}
