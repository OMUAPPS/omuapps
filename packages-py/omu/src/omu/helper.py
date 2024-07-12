from __future__ import annotations

import asyncio
import hashlib
import re
import typing

from loguru import logger

type Coro[**P, T] = typing.Callable[P, typing.Coroutine[None, None, T]]
type AsyncCallback[**P] = Coro[P, typing.Any]


def instance[T](cls: type[T]) -> T:
    return cls()


def map_optional[V, T](
    data: V | None, func: typing.Callable[[V], T], default: T | None = None
) -> T | None:
    if data is None:
        return default
    return func(data)


sanitize_re = re.compile(r"[^\w]")


def sanitize_filename(name: str) -> str:
    return sanitize_re.sub("_", name)


def generate_md5_hash(id: str) -> str:
    return hashlib.md5(id.encode()).hexdigest()


def batch_call(*funcs: typing.Callable[[], None]) -> typing.Callable[[], None]:
    def wrapper():
        for func in funcs:
            func()

    return wrapper


def asyncio_error_logger(loop: asyncio.AbstractEventLoop, context: dict) -> None:
    exception = context.get("exception")
    if exception:
        logger.opt(exception=exception).error(context["message"])
        raise exception
    else:
        logger.error(context["message"])
