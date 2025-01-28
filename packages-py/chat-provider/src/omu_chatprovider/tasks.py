import asyncio
import time
import traceback
import typing


class Tasks:
    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop
        self.tasks: list[asyncio.Task] = []
        self.times: dict[str, float] = {}
        self.times_max: dict[str, float] = {}

    def terminate(self):
        for task in self.tasks:
            task.cancel()

    def create_task(self, coro: typing.Coroutine):
        name = coro.__name__

        async def wrapper():
            start_time = time.time()
            try:
                await coro
            except BaseException as e:
                traceback.print_exc()
                raise Exception(f"Task {name} failed") from e
            finally:
                self.times[name] = time.time() - start_time
                self.times_max[name] = max(self.times_max.get(name, 0), self.times[name])

        self.tasks.append(asyncio.create_task(wrapper()))
