from __future__ import annotations

import json
import re
import time
from collections.abc import Callable, Coroutine

import aiohttp
from loguru import logger
from omu.omu import Omu
from omu_chat import Provider

HTTP_REGEX = r"(https?://)?(www\.)?"
URL_NORMALIZE_REGEX = (
    r"(?P<protocol>https?)?:?\/?\/?" r"(?P<domain>[^.]+\.[^\/]+)" r"(?P<path>[^?#]+)?" r"(?P<query>.+)?"
)


def get_session(omu: Omu, provider: Provider) -> aiohttp.ClientSession:
    ua_data = json.dumps(
        {
            "id": provider.id.key(),
            "version": provider.version,
            "repository_url": provider.repository_url,
        },
    )
    user_agent = f"OMUAPPS/{provider.version} {ua_data}"
    session = aiohttp.ClientSession(
        loop=omu.loop,
        headers={"User-Agent": user_agent},
    )
    return session


def normalize_url(url: str) -> str:
    match = re.match(URL_NORMALIZE_REGEX, url)
    if match is None:
        raise ValueError(f"Invalid URL: {url}")
    protocol = match.group("protocol") or "https"
    domain = match.group("domain")
    path = match.group("path") or ""
    query = match.group("query") or ""
    return f"{protocol}://{domain}{path}{query}"


def assert_none[T](value: T | None, message: str) -> T:
    if value is None:
        raise ValueError(message)
    return value


def timeit[**P, R](func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        logger.info(f"{func.__name__} took {time.time() - start} seconds")
        return result

    return wrapper


def timeit_async[**P, R](
    func: Callable[P, Coroutine[None, None, R]],
) -> Callable[P, Coroutine[None, None, R]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = await func(*args, **kwargs)
        logger.info(f"{func.__name__} took {time.time() - start} seconds")
        return result

    return wrapper


class Traverser[T]:
    def __init__(self, value: T | None = None):
        self.value = value

    def map[V](self, func: Callable[[T], V], default: V | None = None) -> Traverser[V]:
        if self.value is None:
            return TRAVERSE_NONE
        value = func(self.value)
        if value is None:
            return Traverser(default)
        return Traverser(value)

    def get(self, default: T | None = None) -> T | None:
        if self.value is None:
            return default
        return self.value

    def unwrap(self) -> T:
        if self.value is None:
            raise ValueError("Value is None")
        return self.value

    def is_none(self) -> bool:
        return self.value is None


TRAVERSE_NONE = Traverser(None)


def traverse[T](value: T | None) -> Traverser[T]:
    """
    Traverse a value that may be None.
    """
    return Traverser(value)
