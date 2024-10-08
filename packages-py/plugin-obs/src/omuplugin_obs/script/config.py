from pathlib import Path


def get_config_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True)
    config = appdata / "obs_config.json"
    return config


def get_token_path() -> Path:
    appdata = Path.home() / ".omuapps"
    appdata.mkdir(exist_ok=True)
    config = appdata / "token.json"
    return config
