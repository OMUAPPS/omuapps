from __future__ import annotations

import abc
from collections.abc import Callable, Iterable
from typing import (
    Literal,
    LiteralString,
    Protocol,
    Self,
    TypedDict,
)

from omu.identifier import Identifier

type Primitive = dict[str | int, Primitive] | list | str | int | float | bool | None


class ComponentJson(TypedDict):
    type: str
    data: Primitive


class Component[T: LiteralString, D](abc.ABC):
    @classmethod
    @abc.abstractmethod
    def type(cls) -> T: ...

    @staticmethod
    @abc.abstractmethod
    def from_json(json: D) -> Component: ...

    @abc.abstractmethod
    def to_json(self) -> D: ...

    @abc.abstractmethod
    def copy(self) -> Self: ...

    def walk(self, cb: Callable[[Component], None]) -> None:
        stack: list[Component] = [self]
        while stack:
            component = stack.pop()
            if not component:
                continue
            cb(component)
            if isinstance(component, Parent):
                stack.extend(component.get_children())

    def iter(self) -> Iterable[Component]:
        stack: list[Component] = [self]
        while stack:
            component = stack.pop()
            if not component:
                continue
            yield component
            if isinstance(component, Parent):
                stack.extend(component.get_children())


class Parent(abc.ABC):
    @abc.abstractmethod
    def get_children(self) -> list[Component]: ...

    @abc.abstractmethod
    def set_children(self, children: list[Component]) -> None: ...


class ComponentType[D, C: Component](Protocol):
    @classmethod
    def type(cls) -> str: ...

    @staticmethod
    def from_json(json: D) -> C: ...


component_types: dict[str, ComponentType] = {}


def deserialize(json: ComponentJson) -> Component:
    type = component_types.get(json["type"])
    if not type:
        raise ValueError(f'Unknown component type: {json["type"]}')
    return type.from_json(json["data"])


def serialize(component: Component) -> ComponentJson:
    return {
        "type": component.type(),
        "data": component.to_json(),
    }


def register[D: ComponentJson, C: Component](
    component_type: type[Component] | ComponentType[D, C],
):
    type = component_type.type()
    if type in component_types:
        raise ValueError(f"Component type already registered: {type}")
    component_types[type] = component_type


type RootData = list[ComponentJson]


class Root(Component[Literal["root"], RootData], Parent):
    def __init__(self, children: list[Component] | None = None):
        self.children = children or []

    @classmethod
    def type(cls):
        return "root"

    @staticmethod
    def from_json(json: RootData) -> Root:
        return Root([deserialize(child) for child in json])

    def to_json(self) -> RootData:
        return [serialize(child) for child in self.children]

    def copy(self) -> Root:
        return Root([child.copy() for child in self.children])

    def get_children(self) -> list[Component]:
        return self.children

    def set_children(self, children: list[Component]) -> None:
        self.children = children

    def add(self, component: Component):
        if not self.children:
            self.children = []
        self.children.append(component)

    def text(self) -> str:
        return "".join(component.text for component in self.iter() if isinstance(component, Text))

    __str__ = text


type TextData = str


class Text(Component[Literal["text"], TextData]):
    def __init__(self, text: str):
        self.text = text

    @classmethod
    def type(cls):
        return "text"

    @staticmethod
    def from_json(json: TextData) -> Text:
        return Text(json)

    def to_json(self) -> TextData:
        return self.text

    def copy(self) -> Text:
        return Text(self.text)

    @classmethod
    def of(cls, text: str) -> Text:
        return cls(text)


class ImageData(TypedDict):
    url: str
    id: str
    name: str | None


class Image(Component[Literal["image"], ImageData]):
    def __init__(self, url: str, id: str, name: str | None = None):
        self.url = url
        self.id = id
        self.name = name

    @classmethod
    def type(cls):
        return "image"

    @staticmethod
    def from_json(json: ImageData) -> Image:
        return Image(json["url"], json["id"], json.get("name"))

    def to_json(self) -> ImageData:
        return {
            "url": self.url,
            "id": self.id,
            "name": self.name,
        }

    def copy(self) -> Image:
        return Image(self.url, self.id, self.name)

    @classmethod
    def of(cls, *, url: str, id: str, name: str | None = None) -> Image:
        return cls(url, id, name)


class AssetData(TypedDict):
    id: str


class Asset(Component[Literal["asset"], AssetData]):
    def __init__(self, id: Identifier):
        self.id = id

    @classmethod
    def type(cls):
        return "asset"

    @staticmethod
    def from_json(json: AssetData) -> Asset:
        return Asset(Identifier.from_key(json["id"]))

    def to_json(self) -> AssetData:
        return {
            "id": self.id.key(),
        }

    def copy(self) -> Asset:
        return Asset(self.id)


class LinkData(TypedDict):
    url: str
    children: list[ComponentJson]


class Link(Component[Literal["link"], LinkData], Parent):
    def __init__(self, url: str, children: list[Component]):
        self.url = url
        self.children = children

    @classmethod
    def type(cls):
        return "link"

    @classmethod
    def of(cls, url: str, *children: Component) -> Link:
        return cls(url, list(children))

    @staticmethod
    def from_json(json: LinkData) -> Link:
        return Link(json["url"], [deserialize(child) for child in json["children"]])

    def to_json(self) -> LinkData:
        return {
            "url": self.url,
            "children": [serialize(child) for child in self.children],
        }

    def copy(self) -> Link:
        return Link(self.url, [child.copy() for child in self.children])

    def get_children(self) -> list[Component]:
        return self.children

    def set_children(self, children: list[Component]) -> None:
        self.children = children


class System(Component[Literal["system"], RootData], Parent):
    def __init__(self, children: list[Component]):
        self.children = children

    @classmethod
    def type(cls):
        return "system"

    @classmethod
    def of(cls, *children: Component) -> System:
        return cls(list(children))

    @staticmethod
    def from_json(json: RootData) -> System:
        return System([deserialize(child) for child in json])

    def to_json(self) -> RootData:
        return [serialize(child) for child in self.children]

    def copy(self) -> System:
        return System([child.copy() for child in self.children])

    def get_children(self) -> list[Component]:
        return self.children

    def set_children(self, children: list[Component]) -> None:
        self.children = children


type LogLevel = Literal["info", "warning", "error"]


class LogData(TypedDict):
    level: LogLevel
    message: str


class Log(Component[Literal["log"], LogData]):
    def __init__(self, level: LogLevel, message: str):
        self.level: LogLevel = level
        self.message = message

    @classmethod
    def type(cls):
        return "log"

    @classmethod
    def of(cls, level: Literal["info", "warning", "error"], message: str) -> Log:
        return cls(level, message)

    @staticmethod
    def from_json(json: LogData) -> Log:
        return Log(json["level"], json["message"])

    def to_json(self) -> LogData:
        return {
            "level": self.level,
            "message": self.message,
        }

    def copy(self) -> Log:
        return Log(self.level, self.message)


for component_type in {Root, Text, Image, Asset, Link, System, Log}:
    register(component_type)
