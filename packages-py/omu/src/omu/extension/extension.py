from __future__ import annotations

import abc
from collections.abc import Callable

from omu.client import Client
from omu.identifier import Identifier


class Extension(abc.ABC):
    @property
    @abc.abstractmethod
    def type(self) -> ExtensionType: ...


class ExtensionType[T: Extension](Identifier):
    name: str
    create: Callable[[Client], T]
    dependencies: Callable[[], list[ExtensionType]]

    def __init__(
        self,
        name: str,
        create: Callable[[Client], T],
        dependencies: Callable[[], list[ExtensionType]],
    ) -> None:
        super().__init__("ext", name)
        self.name = name
        self.create = create
        self.dependencies = dependencies

    def key(self) -> str:
        return self.name
