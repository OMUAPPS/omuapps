from __future__ import annotations

import sqlite3
from collections.abc import Mapping
from pathlib import Path

from .tableadapter import TableAdapter


class SqliteTableAdapter(TableAdapter):
    def __init__(self, path: Path) -> None:
        self._path = path
        self._conn = sqlite3.connect(path.with_suffix(".db"))
        self._conn.execute(
            # index, key, value
            "CREATE TABLE IF NOT EXISTS data ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "key TEXT UNIQUE,"
            "value BLOB"
            ")"
        )
        self._conn.commit()

    @classmethod
    def create(cls, path: Path) -> TableAdapter:
        return SqliteTableAdapter(path)

    async def store(self) -> None:
        pass

    async def load(self) -> None:
        pass

    async def get(self, key: str) -> bytes | None:
        cursor = self._conn.execute("SELECT value FROM data WHERE key = ?", (key,))
        row = cursor.fetchone()
        if row is None:
            return None
        return row[0]

    async def get_many(self, keys: list[str] | tuple[str, ...]) -> dict[str, bytes]:
        cursor = self._conn.execute(
            f"SELECT key, value FROM data WHERE key IN ({','.join('?' for _ in keys)})",
            keys,
        )
        rows = cursor.fetchall()
        return {row[0]: row[1] for row in rows}

    async def set(self, key: str, value: bytes) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO data (key, value) VALUES (?, ?)",
            (key, value),
        )
        self._conn.commit()

    async def set_all(self, items: Mapping[str, bytes]) -> None:
        query = list(items.items())
        self._conn.executemany(
            "INSERT OR REPLACE INTO data (key, value) VALUES (?, ?)",
            query,
        )
        self._conn.commit()

    async def remove(self, key: str) -> None:
        self._conn.execute("DELETE FROM data WHERE key = ?", (key,))
        self._conn.commit()

    async def remove_all(self, keys: list[str] | tuple[str, ...]) -> None:
        self._conn.execute(
            f"DELETE FROM data WHERE key IN ({','.join('?' for _ in keys)})",
            keys,
        )
        self._conn.commit()

    async def has(self, key: str) -> bool:
        cursor = self._conn.execute("SELECT 1 FROM data WHERE key = ?", (key,))
        return cursor.fetchone() is not None

    async def has_many(self, keys: list[str] | tuple[str, ...]) -> dict[str, bool]:
        cursor = self._conn.execute(
            f"SELECT key FROM data WHERE key IN ({','.join('?' for _ in keys)})",
            keys,
        )
        rows = cursor.fetchall()
        return {row[0]: True for row in rows}

    async def has_any(self, keys: list[str] | tuple[str, ...]) -> bool:
        cursor = self._conn.execute(
            f"SELECT 1 FROM data WHERE key IN ({','.join('?' for _ in keys)})",
            keys,
        )
        return cursor.fetchone() is not None

    async def has_all(self, keys: list[str] | tuple[str, ...]) -> bool:
        cursor = self._conn.execute(
            f"SELECT key FROM data WHERE key IN ({','.join('?' for _ in keys)})",
            keys,
        )
        rows = cursor.fetchall()
        return len(rows) == len(keys)

    async def fetch_items(
        self,
        limit: int,
        backward: bool = False,
        cursor: str | None = None,
    ) -> dict[str, bytes]:
        cursor_id: int | None = None
        if cursor is None:
            if backward:
                _cursor = self._conn.execute("SELECT id FROM data ORDER BY id DESC LIMIT 1")
            else:
                _cursor = self._conn.execute("SELECT id FROM data ORDER BY id LIMIT 1")
            row = _cursor.fetchone()
            if row is None:
                return {}
            cursor_id = row[0]
        else:
            _cursor = self._conn.execute("SELECT id FROM data WHERE key = ?", (cursor,))
            row = _cursor.fetchone()
            if row is None:
                raise ValueError(f"Cursor {cursor} not found")
            cursor_id = row[0]

        if backward:
            _cursor = self._conn.execute(
                "SELECT key, value FROM data WHERE id <= ? ORDER BY id DESC LIMIT ?",
                (cursor_id, limit),
            )
        else:
            _cursor = self._conn.execute(
                "SELECT key, value FROM data WHERE id >= ? ORDER BY id LIMIT ?",
                (cursor_id, limit),
            )
        return {row[0]: (row[1]) for row in _cursor.fetchall()}

    async def fetch_range(self, start: str, end: str) -> dict[str, bytes]:
        start_id: int
        end_id: int
        _cursor = self._conn.execute("SELECT id FROM data WHERE key = ?", (start,))
        row = _cursor.fetchone()
        if row is None:
            raise ValueError(f"start key {start} not found")
        start_id = row[0]

        _cursor = self._conn.execute("SELECT id FROM data WHERE key = ?", (end,))
        row = _cursor.fetchone()
        if row is None:
            raise ValueError(f"end key {end} not found")
        end_id = row[0]

        _cursor = self._conn.execute(
            "SELECT key, value FROM data WHERE id >= ? AND id <= ?",
            (start_id, end_id),
        )
        return {row[0]: (row[1]) for row in _cursor.fetchall()}

    async def fetch_all(self) -> dict[str, bytes]:
        _cursor = self._conn.execute("SELECT key, value FROM data")
        return {row[0]: (row[1]) for row in _cursor.fetchall()}

    async def first(self) -> str | None:
        _cursor = self._conn.execute("SELECT key FROM data ORDER BY id LIMIT 1")
        row = _cursor.fetchone()
        if row is None:
            return None
        return row[0]

    async def last(self) -> str | None:
        _cursor = self._conn.execute("SELECT key FROM data ORDER BY id DESC LIMIT 1")
        row = _cursor.fetchone()
        if row is None:
            return None
        return row[0]

    async def clear(self) -> None:
        self._conn.execute("DELETE FROM data")
        self._conn.commit()

    async def size(self) -> int:
        _cursor = self._conn.execute("SELECT COUNT(*) FROM data")
        row = _cursor.fetchone()
        if row is None:
            return 0
        return row[0]
