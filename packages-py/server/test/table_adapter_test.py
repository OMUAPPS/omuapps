import asyncio
from pathlib import Path

from omuserver.api.table.adapters.sqlitetable import SqliteTableAdapter


def test_fetch_items_uses_exclusive_cursor(tmp_path: Path):
    async def run():
        table = SqliteTableAdapter(tmp_path / "table")
        await table.set_all({str(index): str(index).encode() for index in range(5)})

        latest = await table.fetch_items(limit=2, backward=True)
        assert list(latest) == ["4", "3"]

        older = await table.fetch_items(limit=2, backward=True, cursor="3")
        assert list(older) == ["2", "1"]

        earliest = await table.fetch_items(limit=2, backward=True, cursor="1")
        assert list(earliest) == ["0"]

        first = await table.fetch_items(limit=2)
        assert list(first) == ["0", "1"]

        newer = await table.fetch_items(limit=2, cursor="1")
        assert list(newer) == ["2", "3"]

    asyncio.run(run())
