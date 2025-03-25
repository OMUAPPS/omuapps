from __future__ import annotations

import abc
from collections.abc import Callable
from typing import Literal, NoReturn, TypeGuard, final


class UnwrapError[T, E](Exception):
    def __init__(self, result: Result[T, E], message: str):
        self.result = result
        self.message = message
        super().__init__(message)


class Monad[T, E](abc.ABC):
    @property
    @abc.abstractmethod
    def is_ok(self) -> Literal[True, False]: ...

    @property
    @abc.abstractmethod
    def is_err(self) -> Literal[True, False]: ...


@final
class Ok[T, E](Monad[T, E]):
    __match_args__ = ("value",)
    __slots__ = ("value",)

    def __init__(self, value: T):
        self.value = value

    @property
    def is_ok(self) -> Literal[True]:
        return True

    @property
    def is_err(self) -> Literal[False]:
        return False

    def unwrap(self) -> T:
        return self.value

    def apply(self, f: Callable[[T], None]) -> Result[T, E]:
        f(self.value)
        return self

    def apply_err(self, f: Callable[[E], None]) -> Result[T, E]:
        return self

    def map[V](self, f: Callable[[T], V]) -> Result[V, E]:
        return Ok(f(self.value))

    def map_err[V](self, f: Callable[[E], V]) -> Ok[T, E]:
        return self

    def and_then[V](self, f: Callable[[T], Result[V, E]]) -> Result[V, E]:
        return f(self.value)

    def join(self, other: Result[T, E]) -> Result[T, E]:
        return other

    __and__ = join

    def join_err(self, other: Result[T, E]) -> Result[T, E]:
        return self


@final
class Err[T, E](Monad[T, E]):
    __match_args__ = ("err",)
    __slots__ = ("err",)

    def __init__(self, err: E):
        self.err = err

    @property
    def is_ok(self) -> Literal[False]:
        return False

    @property
    def is_err(self) -> Literal[True]:
        return True

    def unwrap(self) -> NoReturn:
        exc = UnwrapError(
            result=self,
            message=f"called `unwrap` on an `Err` value: {self.err}",
        )
        if isinstance(self.err, BaseException):
            raise exc from self.err
        raise exc

    def apply(self, f: Callable[[T], None]) -> Result[T, E]:
        return self

    def apply_err(self, f: Callable[[E], None]) -> Result[T, E]:
        f(self.err)
        return self

    def map[V](self, f: Callable[[T], V]) -> Result[T, E]:
        return self

    def map_err[V](self, f: Callable[[E], V]) -> Err[T, V]:
        return Err(f(self.err))

    def and_then[V](self, f: Callable[[T], Result[V, E]]) -> Result[T, E]:
        return self

    def join(self, other: Result[T, E]) -> Result[T, E]:
        return self

    __and__ = join

    def join_err(self, other: Result[T, E]) -> Result[T, E]:
        return other


type Result[T, E] = Ok[T, E] | Err[T, E]


def is_ok[T, E](result: Result[T, E]) -> TypeGuard[Ok[T, E]]:
    return result.is_ok


def is_err[T, E](result: Result[T, E]) -> TypeGuard[Err[T, E]]:
    return result.is_err
