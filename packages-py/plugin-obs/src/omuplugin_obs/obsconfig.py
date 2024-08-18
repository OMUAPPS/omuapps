from pathlib import Path


def load_configuration(path: Path) -> dict[str, dict[str, str]]:
    text = path.read_text(encoding="utf-8-sig")
    sections: dict[str, dict[str, str]] = {}
    section: str | None = None
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("["):
            section = line[1:-1]
            sections[section] = {}
        else:
            if section is None:
                raise ValueError("Key-value pair without a section")
            key, value = line.split("=", 1)
            sections[section][key.strip()] = value.strip()
    return sections


def save_configuration(path: Path, config: dict[str, dict[str, str]]):
    lines: list[str] = []
    for section, items in config.items():
        lines.append(f"[{section}]")
        for key, value in items.items():
            lines.append(f"{key}={value}")
    path.write_text("\n".join(lines), encoding="utf-8-sig")
