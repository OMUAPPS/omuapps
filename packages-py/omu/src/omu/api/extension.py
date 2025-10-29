from __future__ import annotations

import abc
from collections.abc import Callable
from typing import TYPE_CHECKING

from omu.identifier import Identifier

if TYPE_CHECKING:
    from omu.omu import Omu


class Extension(abc.ABC):
    @property
    @abc.abstractmethod
    def type(self) -> ExtensionType: ...


EXT_NAMESPACE = "ext"


class ExtensionType[T: Extension](Identifier):
    name: str
    create: Callable[[Omu], T]

    def __init__(
        self,
        name: str,
        create: Callable[[Omu], T],
    ) -> None:
        super().__init__(EXT_NAMESPACE, name)
        self.name = name
        self.create = create

    def key(self) -> str:
        return self.name
