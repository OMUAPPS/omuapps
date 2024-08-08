import asyncio
import tempfile
from collections.abc import Coroutine
from pathlib import Path
from sys import stdout


async def main():
    tasks: list[Coroutine] = []
    outputs: list[str] = []

    async def run(*args, cwd: Path):
        with tempfile.TemporaryFile() as stdout:
            process = await asyncio.create_subprocess_exec(
                *args,
                cwd=cwd,
                stdout=stdout,
                stderr=stdout,
            )
            await process.communicate()
            stdout.seek(0)
            outputs.append(stdout.read().decode())

    for package in Path("packages-js").glob("*"):
        if not package.is_dir():
            continue
        task = run("bun", "update", "--latest", cwd=package)
        tasks.append(task)

    await asyncio.gather(*tasks)
    await run("bun", "i", "--yarn", cwd=Path.cwd())

    stdout.write("\n".join(outputs))


asyncio.run(main())
