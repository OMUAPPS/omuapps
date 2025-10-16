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
        pass

    version_path.write_text(VERSION)
