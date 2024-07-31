class OBSConfig(dict[str, dict[str, str]]):
    @classmethod
    def loads(cls, text: str) -> "OBSConfig":
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
        return cls(sections)

    def dumps(self) -> str:
        lines: list[str] = []
        for section, items in self.items():
            lines.append(f"[{section}]")
            for key, value in items.items():
                lines.append(f"{key}={value}")
        return "\n".join(lines)
