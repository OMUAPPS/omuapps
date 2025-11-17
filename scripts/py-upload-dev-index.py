import asyncio
import sys
from pathlib import Path


async def main():
    packages_path = Path(".venv/packages")
    packages_path.mkdir(parents=True, exist_ok=True)
    server = await asyncio.create_subprocess_exec(
        "uv",
        "run",
        "pypi-server",
        "run",
        "-i",
        "127.0.0.1",
        "-p",
        "26410",
        "--verbose",
        str(packages_path),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    print("Type 'build' to build and upload dev packages to the dev index.")
    while True:
        command, *args = input("").split(" ")
        if command in {"build", "b"}:
            if not args:
                build = await asyncio.create_subprocess_exec(
                    "uv",
                    "build",
                    "--clean",
                    "--all-packages",
                    "--out-dir",
                    str(packages_path),
                    stdout=sys.stdout,
                    stderr=sys.stderr,
                )
            else:
                build = await asyncio.create_subprocess_exec(
                    "uv",
                    "build",
                    "--out-dir",
                    str(packages_path),
                    "--package",
                    *args,
                    stdout=sys.stdout,
                    stderr=sys.stderr,
                )
            await build.wait()
        elif command in {"exit", "quit", "q"}:
            server.terminate()
            await server.wait()
            break
        else:
            print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main())
