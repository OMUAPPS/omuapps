import asyncio
import base64
import json
import shutil
import sys
from pathlib import Path
from types import SimpleNamespace

from omu.api.permission import PermissionType
from omu.api.registry import RegistryPermissions
from omu.app import App, AppType
from omu.identifier import Identifier
from omuserver.api.asset.extension import AssetIndex
from omuserver.api.registry.registry import ServerRegistry
from omuserver.api.table.adapters.sqlitetable import SqliteTableAdapter
from omuserver.directories import Directories
from omuserver.helper import safe_path_join
from omuserver.security import PermissionManager

IDENTIFIERS = [
    "com.example:app",
    "com.omuapps:chat/messages",
    "ext:table/permission",
    "my-app.example:a b/c.d-e_f",
    "jp.example:チャット/メッセージ",
    "jp.example:①②/full　width",
    "com.example:café/😀",
]


def encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def relative(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def write_tables(root: Path, directories: Directories) -> list[dict]:
    id = Identifier.from_key("com.example:app/items")
    path = directories.get("tables") / id.get_sanitized_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    adapter = SqliteTableAdapter(path)
    items = {f"key{index}": f"value{index}".encode() for index in range(1, 6)}

    async def fill():
        await adapter.set_all(items)
        await adapter.remove("key2")
        await adapter.set("key3", b"value3-updated")
        await adapter.set("key6", b"\x00\x01\x02\xff")

    asyncio.run(fill())
    rows = adapter._conn.execute("SELECT id, key, value FROM data ORDER BY id").fetchall()
    adapter._conn.close()
    return [
        {
            "id": id.key(),
            "file": relative(root, path.with_suffix(".db")),
            "rows": [{"id": row[0], "key": row[1], "value": encode(row[2])} for row in rows],
        }
    ]


def write_registries(root: Path, server: SimpleNamespace) -> list[dict]:
    id = Identifier.from_key("com.example:app/settings")
    registry = ServerRegistry(server, id)
    value = json.dumps({"volume": 0.5, "name": "テスト"}, ensure_ascii=False).encode()
    permissions = RegistryPermissions(
        read=Identifier.from_key("com.example:app/settings/read"),
        write=Identifier.from_key("com.example:app/settings/write"),
    )

    async def fill():
        registry.set_permissions(permissions)
        registry.store(value)
        if registry.save_task is not None:
            await registry.save_task

    asyncio.run(fill())
    return [
        {
            "id": id.key(),
            "file": relative(root, registry._path),
            "meta_file": relative(root, registry.meta_path),
            "value": encode(value),
            "permissions": permissions.to_json(),
        }
    ]


def write_assets(root: Path, directories: Directories) -> list[dict]:
    id = Identifier.from_key("com.example:app/images/icon.png")
    content = bytes(range(256))
    path = id.get_sanitized_path()
    file = safe_path_join(directories.assets, path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_bytes(content)
    index = AssetIndex(directories.assets / "index.sqlite")
    index.insert(id, path)
    index.record_upload(id)
    index.index_db.close()
    return [
        {
            "id": id.key(),
            "file": relative(root, file),
            "index_path": path.as_posix(),
            "content": encode(content),
        }
    ]


def write_security(server: SimpleNamespace) -> list[dict]:
    manager = PermissionManager(server, {}, {})
    permission = PermissionType.create(
        Identifier.from_key("com.example:app"),
        "permission",
        {"level": "low", "name": {"ja": "テスト", "en": "Test"}},
    )
    manager.register_permission(permission)
    parent = App(
        Identifier.from_key("com.example:app"),
        version="1.0.0",
        url="https://app.example.com/",
        metadata={"locale": "ja", "name": {"ja": "アプリ", "en": "App"}},
    )
    child = App(
        Identifier.from_key("com.example:app/child"),
        type=AppType.REMOTE,
        parent_id=parent.id,
        url="https://app.example.com/child",
    )
    entries = []
    for app, granted in ((parent, [permission.id]), (child, [])):
        handle, token = manager.generate_app_token(app)
        handle.grant_all(granted)
        entries.append(
            {
                "id": app.id.key(),
                "token": token,
                "app": app.to_json(),
                "permissions": [id.key() for id in granted],
            }
        )
    manager.store()
    return entries


def main(output: Path) -> None:
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    directories = Directories(
        data=output / "data",
        assets=output / "assets",
        index=output / "index.html",
        frame=output / "frame.html",
        index_install=output / "index_install.html",
        version=output / "VERSION",
    )
    directories.mkdir()
    server = SimpleNamespace(directories=directories)
    manifest = {
        "identifiers": [
            {
                "key": key,
                "sanitized_path": Identifier.from_key(key).get_sanitized_path().as_posix(),
                "sanitized_key": Identifier.from_key(key).get_sanitized_key(),
            }
            for key in IDENTIFIERS
        ],
        "tables": write_tables(output, directories),
        "registries": write_registries(output, server),
        "assets": write_assets(output, directories),
        "apps": write_security(server),
    }
    (output.parent / "python-data.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
