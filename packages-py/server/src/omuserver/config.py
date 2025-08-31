from dataclasses import dataclass, field

from omu.address import Address

from omuserver.directories import Directories


@dataclass(slots=True)
class Config:
    address: Address = Address.default()
    debug: bool = False
    hash: str | None = None
    extra_trusted_origins: list[str] = field(default_factory=list)
    directories: Directories = field(default_factory=Directories.default)
    dashboard_token: str | None = None
