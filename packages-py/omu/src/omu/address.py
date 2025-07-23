import socket
from dataclasses import dataclass


def get_lan_ip():
    return socket.gethostbyname(socket.gethostname())


@dataclass(frozen=True, slots=True)
class Address:
    host: str
    port: int
    secure: bool = False

    @classmethod
    def default(cls) -> "Address":
        return cls(host=get_lan_ip(), port=26423)

    def to_url(self) -> str:
        return f"{'https' if self.secure else 'http'}://" f"{self.host or 'localhost'}:{self.port}"
