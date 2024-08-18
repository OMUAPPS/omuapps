from __future__ import annotations

import sys

from loguru import logger

if sys.platform != "win32":
    raise NotImplementedError("This module is only implemented for Windows")

from collections.abc import Iterable

import psutil
import win32con
import win32gui
import win32process


def is_hwnd_visible(hwnd: int) -> bool:
    return win32gui.IsWindowVisible(hwnd) != 0


def is_hwnd_ancestor(hwnd: int) -> bool:
    ancestor = win32gui.GetAncestor(hwnd, win32con.GA_ROOTOWNER)
    return ancestor == hwnd


def is_hwnd_of_process(hwnd: int, process_id: int) -> bool:
    _, pid = win32process.GetWindowThreadProcessId(hwnd)
    return pid == process_id


def find_hwnd_ids(
    process_id: int | None = None,
    skip_invisible: bool = True,
    skip_ancestors: bool = True,
) -> Iterable[int]:
    def callback(hwnd: int, hwnds: set[int]):
        if process_id and not is_hwnd_of_process(hwnd, process_id):
            return True
        if skip_invisible and not is_hwnd_visible(hwnd):
            return True
        if skip_ancestors and is_hwnd_ancestor(hwnd):
            return True
        hwnds.add(hwnd)
        return True

    hwnds: set[int] = set()
    win32gui.EnumWindows(callback, hwnds)
    return hwnds


def close_process_window(process: psutil.Process):
    hwnd_ids = find_hwnd_ids(process.pid, skip_ancestors=False)

    for hwnd_id in hwnd_ids:
        win32gui.SendMessage(hwnd_id, win32con.WM_CLOSE, 0, 0)
    else:
        logger.warning(f"No window found for process {process.pid}")
        process.terminate()
