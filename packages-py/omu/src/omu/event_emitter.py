from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Self

from loguru import logger

from omu.helper import Coro

type Unlisten = Callable[[], None]


class EventEmitter[**P]:
    def __init__(
        self,
        on_subscribe: Callable[[], None] | Coro[[], None] | None = None,
        on_empty: Callable[[], None] | Coro[[], None] | None = None,
        catch_errors: bool = False,
    ) -> None:
        self.on_subscribe = on_subscribe
        self.on_empty = on_empty
        self.catch_errors = catch_errors
        self._listeners: list[Callable[P, None] | Coro[P, None]] = []
        self.closed = False

    @property
    def empty(self) -> bool:
        return len(self._listeners) == 0

    def close(self) -> None:
        self.closed = True
        self._listeners.clear()

    def listen(self, listener: Callable[P, None] | Coro[P, None]) -> Unlisten:
        if self.closed:
            raise ValueError("EventEmitter is closed")
        if listener in self._listeners:
            raise ValueError("Listener already subscribed")
        if self.on_subscribe and len(self._listeners) == 0:
            coroutine = self.on_subscribe()
            if asyncio.iscoroutine(coroutine):
                asyncio.create_task(coroutine)
        self._listeners.append(listener)
        return lambda: self.unlisten(listener)

    def unlisten(self, listener: Callable[P, None] | Coro[P, None]) -> None:
        if listener not in self._listeners:
            return
        self._listeners.remove(listener)
        if self.on_empty and len(self._listeners) == 0:
            coroutine = self.on_empty()
            if asyncio.iscoroutine(coroutine):
                asyncio.create_task(coroutine)

    async def emit(self, *args: P.args, **kwargs: P.kwargs) -> None:
        if self.closed:
            raise ValueError("EventEmitter is closed")
        for listener in tuple(self._listeners):
            try:
                result = listener(*args, **kwargs)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                if self.catch_errors:
                    logger.opt(exception=e).error("Error in listener")
                else:
                    raise e

    def __iadd__(self, listener: Callable[P, None] | Coro[P, None]) -> Self:
        self.listen(listener)
        return self

    __call__ = emit
