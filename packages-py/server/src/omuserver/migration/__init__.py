from omuserver.server import Server
from omuserver.version import VERSION


def migrate(server: Server):
    version_path = server.config.directories.version
    if not version_path.exists():
        version_path.touch()
        version_path.write_text("0.0.0")
    previous_version = version_path.read_text().strip()
    if previous_version == "0.0.0":
        previous_version = "0.9.10"
    if previous_version == "0.9.10":
        cursor = server.security._token_db.cursor()
        cursor.execute("PRAGMA table_info(tokens)")
        columns = cursor.fetchall()
        if not any(column[1] == "used_count" for column in columns):
            cursor.execute("ALTER TABLE tokens ADD COLUMN used_count INTEGER")
            cursor.execute("UPDATE tokens SET used_count = 0")

        cursor.execute("PRAGMA table_info(remote_tokens)")
        columns = cursor.fetchall()
        if not any(column[1] == "used_count" for column in columns):
            cursor.execute("ALTER TABLE remote_tokens ADD COLUMN used_count INTEGER")
            cursor.execute("UPDATE remote_tokens SET used_count = 0")
        server.security._token_db.commit()

    version_path.write_text(VERSION)
