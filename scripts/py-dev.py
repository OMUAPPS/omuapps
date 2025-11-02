import asyncio
import socket
import sys
import traceback
from collections.abc import Generator

import click
import psutil
from omu.result import Err, Ok, Result


def find_processes_by_port(port: int) -> Generator[psutil.Process, None, None]:
    ids: set[int] = set()
    for connection in psutil.net_connections():
        if connection.pid is None:
            continue
        if connection.pid in ids:
            continue
        ids.add(connection.pid)
        try:
            if connection.laddr and connection.laddr.port == port:
                yield psutil.Process(connection.pid)
        except psutil.NoSuchProcess:
            pass
        except psutil.AccessDenied:
            pass


def check_port_in_use(port: int) -> Result[..., list[psutil.Process]]:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        used = sock.connect_ex(("localhost", port)) == 0
    if not used:
        return Ok(...)
    processes = list(find_processes_by_port(port))
    return Err(processes)


def check_port(port: int, name: str):
    used = check_port_in_use(port)
    if used.is_ok is True:
        return
    print(f"Port {port} ({name}) is used by: {", ".join([f"{p.name()} ({p.pid})" for p in used.err])}")
    for process in used.err:
        kill_process(process).unwrap()


def kill_process(process: psutil.Process) -> Result[..., str]:
    try:
        process.terminate()
        print(f"Terminated {process.name()} ({process.pid})")
    except psutil.NoSuchProcess:
        return Err(f"Process {process.pid} no longer exists")
    except psutil.AccessDenied:
        return Err(f"Access denied to terminate {process.name()} ({process.pid})")
    return Ok(...)


async def start_process(command: str):
    while True:
        process = None
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=sys.stdout,
                stderr=sys.stderr,
            )
            await process.wait()
            print(f"Process {command} exited with code {process.returncode}")
        except asyncio.CancelledError:
            break
        except Exception:
            traceback.print_exc()
        finally:
            if process and process.returncode is not None:
                try:
                    process.terminate()
                except ProcessLookupError:
                    pass


async def build_packages():
    process = await asyncio.create_subprocess_shell(
        "bun run build",
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    await process.wait()


@click.command()
@click.option("--dash", is_flag=True, default=False, help="Building and watching the dashboard")
@click.option("--apps", is_flag=True, default=False, help="Building and watching the apps")
def main(dash: bool = False, apps: bool = False):
    print("Starting...")

    async def run():
        await build_packages()
        loop = asyncio.get_event_loop()
        commands: list[str] = []
        if dash:
            commands = [*commands, "bun run --cwd packages-js/dash ui:dev", "bun run --cwd packages-js/dash dev"]
            check_port(26420, "dashboard")
        if apps:
            commands = [
                *commands,
                "bun run --cwd packages-js/dash ui:dev",
                "bun run --cwd packages-js/site dev",
                "bun run --cwd packages-js/dash ui:check-watch",
                "bun run --cwd packages-js/site check:watch",
                "bun run --cwd packages-js/ui watch",
                "bun run --cwd packages-js/i18n watch",
                "bun run --cwd packages-js/omu watch",
                "bun run --cwd packages-js/chat watch",
                "bun run --cwd packages-js/plugin-obs watch",
            ]
            check_port(5173, "site")

        tasks = [loop.create_task(start_process(command)) for command in commands]
        await asyncio.gather(*tasks)

    asyncio.run(run())


if __name__ == "__main__":
    main()
