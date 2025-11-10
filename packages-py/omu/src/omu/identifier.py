from __future__ import annotations

import re
from pathlib import Path
from typing import Final

from yarl import URL

from omu.helper import generate_md5_hash, sanitize_filename
from omu.model import Model

from .interface import Keyable

NAMESPACE_REGEX = re.compile(r"^(\.[^/:.]|[\w-])+$")
NAME_REGEX = re.compile(r"^[^/:]+$")


class Identifier(Model[str], Keyable):
    def __init__(self, namespace: str, *path: str) -> None:
        self.validate(namespace, *path)
        self.namespace: Final[str] = namespace
        self.path: Final[tuple[str, ...]] = path

    @classmethod
    def validate(cls, namespace: str, *path: str) -> None:
        if not namespace:
            raise AssertionError("Invalid namespace: Namespace cannot be empty")
        if len(path) == 0:
            raise AssertionError("Invalid path: Path must have at least one name")
        if not NAMESPACE_REGEX.match(namespace):
            raise AssertionError(f"Invalid namespace: Namespace must match {NAMESPACE_REGEX.pattern}")
        for name in path:
            if not NAME_REGEX.match(name):
                raise AssertionError(f"Invalid name: Name must match {NAME_REGEX.pattern}")

    @classmethod
    def format(cls, namespace: str, *path: str) -> str:
        cls.validate(namespace, *path)
        return f"{namespace}:{'/'.join(path)}"

    @classmethod
    def from_key(cls, key: str) -> Identifier:
        separator = key.find(":")
        if separator == -1:
            raise AssertionError(f"Invalid key: No separator found in {key}")
        if key.find(":", separator + 1) != -1:
            raise AssertionError(f"Invalid key: Multiple separators found in {key}")
        namespace, path = key[:separator], key[separator + 1 :]
        if not namespace or not path:
            raise AssertionError("Invalid key: Namespace and path cannot be empty")
        return cls(namespace, *path.split("/"))

    @classmethod
    def from_url(cls, url: URL) -> Identifier:
        namespace = cls.namespace_from_url(url)
        path = url.path.split("/")[1:]
        return cls(namespace, *path)

    def into_url(self) -> URL:
        host = ".".join(reversed(self.namespace.split(".")))
        return URL.build(
            scheme="http",
            host=host,
            path="/".join(self.path),
        )

    @classmethod
    def namespace_from_url(cls, url: URL) -> str:
        parsed = URL(url)
        if parsed.host is None:
            raise AssertionError("Invalid host name")
        return ".".join(reversed(parsed.host.split(".")))

    def to_json(self) -> str:
        return self.key()

    @classmethod
    def from_json(cls, json: str) -> Identifier:
        return cls.from_key(json)

    def key(self) -> str:
        return self.format(self.namespace, *self.path)

    def get_sanitized_path(self) -> Path:
        sanitized_namespace = f"{sanitize_filename(self.namespace)}-{generate_md5_hash(self.namespace)}"
        path_hash = generate_md5_hash("/".join(self.path))
        sanitized_path = f"{'-'.join(sanitize_filename(name) for name in self.path)}-{path_hash}"
        return Path(sanitized_namespace, sanitized_path)

    def get_sanitized_key(self) -> str:
        key = self.key()
        return f"{sanitize_filename(key)}-{generate_md5_hash(key)}"

    def is_subpath_of(self, base: Identifier) -> bool:
        return self.namespace == base.namespace and self.path[: len(base.path)] == base.path

    def is_namepath_equal(
        self,
        other: Identifier,
        max_depth: int | None = None,
    ) -> bool:
        if max_depth is None:
            max_depth = len(self.path)
        return self.namespace == other.namespace and self.path[:max_depth] == other.path[:max_depth]

    def join(self, *path: str) -> Identifier:
        return Identifier(self.namespace, *self.path, *path)

    def __truediv__(self, name: str) -> Identifier:
        return self.join(name)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Identifier):
            return NotImplemented
        return self.key() == other.key()

    def __hash__(self) -> int:
        return hash(self.key())

    def __repr__(self) -> str:
        return f"Identifier({self.key()})"

    def __str__(self) -> str:
        return self.key()
