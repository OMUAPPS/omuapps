import asyncio
import socket
import sys
import traceback
from collections.abc import Generator

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


def check_ports():
    ports = {
        26420: "dashboard",
        5173: "site",
    }
    for port, name in ports.items():
        used = check_port_in_use(port)
        if used.is_ok is True:
            continue
        print(f"Port {port} ({name}) is used by: {", ".join([f"{p.name()} ({p.pid})" for p in used.err])}")
        yes_no = input(f"Do you want to kill the process using port {port}? (y/n): ")
        if yes_no not in {"y", "Y", "yes", "YES"}:
            continue
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
        print(f"Restarting process {command} in 5 seconds...")
        await asyncio.sleep(5)


async def build_packages():
    process = await asyncio.create_subprocess_shell(
        "bun run build",
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    await process.wait()


async def main():
    check_ports()
    await build_packages()
    loop = asyncio.get_event_loop()
    commands = [
        "bun run --cwd packages-js/dash ui:dev",
        "bun run --cwd packages-js/dash dev",
        "bun run --cwd packages-js/site dev",
        "bun run --cwd packages-js/dash ui:check-watch",
        "bun run --cwd packages-js/site check:watch",
        "bun run --cwd packages-js/ui watch",
        "bun run --cwd packages-js/i18n watch",
        "bun run --cwd packages-js/omu watch",
        "bun run --cwd packages-js/chat watch",
        "bun run --cwd packages-js/plugin-obs watch",
    ]
    tasks = [loop.create_task(start_process(command)) for command in commands]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    asyncio.run(main())
