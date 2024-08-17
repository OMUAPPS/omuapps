def loads(text: str) -> dict[str, dict[str, str]]:
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


def dumps(config: dict[str, dict[str, str]]) -> str:
    lines: list[str] = []
    for section, items in config.items():
        lines.append(f"[{section}]")
        for key, value in items.items():
            lines.append(f"{key}={value}")
    return "\n".join(lines)
