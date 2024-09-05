from __future__ import annotations

import abc
import json
from collections.abc import Callable, Mapping
from typing import Protocol


class SerializeError(Exception):
    pass


class Serializable[T, D](Protocol):
    @abc.abstractmethod
    def serialize(self, item: T) -> D: ...

    @abc.abstractmethod
    def deserialize(self, item: D) -> T: ...


class JsonSerializable[T, D](Protocol):
    def to_json(self) -> D: ...

    @classmethod
    def from_json(cls, json: D) -> T: ...


class Serializer[T, D](Serializable[T, D]):
    def __init__(self, serialize: Callable[[T], D], deserialize: Callable[[D], T]):
        self._serialize = serialize
        self._deserialize = deserialize

    def serialize(self, item: T) -> D:
        return self._serialize(item)

    def deserialize(self, item: D) -> T:
        return self._deserialize(item)

    @classmethod
    def of[_T, _D](cls, serializer: Serializable[_T, _D]) -> Serializer[_T, _D]:
        return Serializer(serializer.serialize, serializer.deserialize)

    @classmethod
    def noop(cls) -> Serializer[T, T]:
        return NoopSerializer()

    @classmethod
    def model[_T, _D](cls, model: type[JsonSerializable[_T, _D]]) -> Serializer[_T, _D]:
        return ModelSerializer(model)  # type: ignore

    @classmethod
    def json(cls) -> Serializer[T, bytes]:
        return JsonSerializer()

    def to_json(self) -> Serializer[T, bytes]:
        return self.pipe(JsonSerializer())

    def to_array(self) -> Serializer[list[T], list[D]]:
        return ArraySerializer(self)

    def to_map(self) -> Serializer[Mapping[str, T], Mapping[str, D]]:
        return MapSerializer(self)

    def pipe[E](self, other: Serializable[D, E]) -> Serializer[T, E]:
        return PipeSerializer(self, other)


class NoopSerializer[T](Serializer[T, T]):
    def __init__(self):
        super().__init__(lambda item: item, lambda item: item)

    def __repr__(self) -> str:
        return "NoopSerializer()"


class ModelSerializer[M: JsonSerializable, D](Serializer[M, D]):
    def __init__(self, model: type[JsonSerializable[M, D]]):
        self._model = model
        super().__init__(
            lambda item: item.to_json(), lambda item: model.from_json(item)
        )

    def __repr__(self) -> str:
        return f"ModelSerializer({self._model})"


class JsonSerializer[T](Serializer[T, bytes]):
    def __init__(self):
        super().__init__(
            self._serialize,
            self._deserialize,
        )

    def _serialize(self, item: T) -> bytes:
        return json.dumps(item).encode("utf-8")

    def _deserialize(self, item: bytes) -> T:
        decoded = item.decode("utf-8")
        try:
            return json.loads(decoded)
        except json.JSONDecodeError as e:
            raise SerializeError(f"Failed to deserialize JSON: {decoded}") from e

    def __repr__(self) -> str:
        return "JsonSerializer()"


class ArraySerializer[T, D](Serializer[list[T], list[D]]):
    def __init__(self, serializer: Serializable[T, D]):
        self._serializer = serializer
        super().__init__(
            lambda items: [serializer.serialize(item) for item in items],
            lambda items: [serializer.deserialize(item) for item in items],
        )

    def __repr__(self) -> str:
        return f"ArraySerializer({self._serializer})"


class MapSerializer[T, D](Serializer[Mapping[str, T], Mapping[str, D]]):
    def __init__(self, serializer: Serializable[T, D]):
        self._serializer = serializer
        super().__init__(
            self._serialize,
            self._deserialize,
        )

    def _serialize(self, items: Mapping[str, T]) -> Mapping[str, D]:
        return {key: self._serializer.serialize(value) for key, value in items.items()}

    def _deserialize(self, items: Mapping[str, D]) -> Mapping[str, T]:
        return {
            key: self._serializer.deserialize(value) for key, value in items.items()
        }

    def __repr__(self) -> str:
        return f"MapSerializer({self._serializer})"


class PipeSerializer[T, D, E](Serializer[T, E]):
    def __init__(self, a: Serializable[T, D], b: Serializable[D, E]):
        self._a = a
        self._b = b
        super().__init__(
            lambda item: b.serialize(a.serialize(item)),
            lambda item: a.deserialize(b.deserialize(item)),
        )

    def __repr__(self) -> str:
        return f"PipeSerializer({self._a}, {self._b})"
