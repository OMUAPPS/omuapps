from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Address:
    host: str | None
    port: int
    secure: bool = False

    def to_url(self) -> str:
        return (
            f"{'https' if self.secure else 'http'}://"
            f"{self.host or 'localhost'}:{self.port}"
        )
