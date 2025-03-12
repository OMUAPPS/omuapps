from dataclasses import dataclass
from typing import Any


def extract_blocks(text: str, brackets: tuple[str, str] = ("{", "}")) -> list[str]:
    open_bracket, close_bracket = brackets
    blocks: list[str] = []
    current_level = 0
    start = -1
    # for i, char in enumerate(text):
    i = 0
    length = len(text)
    while i < length:
        char = text[i]
        i += 1
        if char in ('"', "'", "`"):
            string_quote = char
            escape = False
            while i < length:
                char = text[i]
                i += 1
                if escape:
                    escape = False
                    continue
                if char == "\\":
                    escape = True
                elif char == string_quote:
                    string_quote = None
                    break
        elif char == open_bracket:
            current_level += 1
            if current_level == 1:
                start = i  # Start after the opening bracket
        elif char == close_bracket:
            if current_level > 0:
                current_level -= 1
                if current_level == 0:
                    blocks.append(text[start : i - 1])  # Exclude the closing bracket
    return blocks


def find_block(text: str, start: int, brackets: tuple[str, str] = ("{", "}")) -> str | None:
    open_bracket, close_bracket = brackets
    current_level = 0
    in_string = False
    string_quote: str | None = None
    escape = False
    for i, char in enumerate(text[start:], start=start):
        if escape:
            escape = False
            continue
        if in_string:
            if char == "\\":
                escape = True
            elif char == string_quote:
                in_string = False
                string_quote = None
        else:
            if char in ('"', "'", "`"):
                in_string = True
                string_quote = char
            elif char == open_bracket:
                current_level += 1
            elif char == close_bracket:
                if current_level == 0:
                    return text[start:i]
                current_level -= 1
    return None


@dataclass(slots=True)
class TextStream:
    text: str
    index: int

    def read(self) -> str:
        if self.index < len(self.text):
            self.index += 1
            return self.text[self.index - 1]
        raise ValueError("End of text")

    def read_ahead(self, n: int) -> str:
        if self.index + n < len(self.text):
            return self.text[self.index + n]
        raise ValueError("End of text")

    def skip_whitespace(self):
        while self.index < len(self.text) and self.text[self.index].isspace():
            self.index += 1

    def read_until(self, char: str) -> str:
        start = self.index
        while self.index < len(self.text):
            if self.text[self.index] == char:
                break
            self.index += 1
        return self.text[start : self.index]

    def skip(self):
        self.index += 1

    def read_string(self) -> str:
        quote = self.read()
        start = self.index
        while self.index < len(self.text):
            if self.text[self.index] == quote and (
                self.text[self.index - 1] != "\\" or self.text[self.index - 2] == "\\"
            ):
                break
            self.index += 1
        return self.text[start : self.index]

    def is_eof(self) -> bool:
        return self.index >= len(self.text)

    def __repr__(self):
        return f"TextStream({self.text[self.index :]})"


def parse_js_object(raw: str) -> Any:
    """
    variableDefinitions: [{
            kind: "VariableDefinition",
            variable: {
                kind: "Variable",
                name: {
                    kind: "Name",
                    value: "channelID"
                }
            },
            type: {
                kind: "NonNullType",
                type: {
                    kind: "NamedType",
                    name: {
                        kind: "Name",
                        value: "ID"
                    }
                }
            },
            directives: []
    }],
    """
    raw = raw.strip()
    if not raw.startswith("{") or not (raw.endswith("}") or raw.endswith("},")):
        raise ValueError("Invalid object")
    text = TextStream(raw[1:], 0)
    result = {}
    stack: list[Any] = [result]
    current = result
    key = None
    value = None
    while not text.is_eof():
        text.skip_whitespace()
        if key is None and isinstance(current, dict):
            key = text.read_until(":").strip()
            text.skip()
            text.skip_whitespace()
        next_char = text.read_ahead(0)
        if next_char in ('"', "'", "`"):
            value = text.read_string()
            text.skip()
        elif next_char == "!":
            text.skip()
            next_char = text.read_ahead(0)
            value = next_char == "0"
            text.skip()
        elif next_char.isdigit():
            raise Exception("Not implemented")
        elif next_char == "[":
            text.skip()
            value = []
            stack.append(value)
        elif next_char == "{":
            text.skip()
            value = {}
            stack.append(value)

        if isinstance(current, dict):
            current[key] = value
            key = None
        elif isinstance(current, list):
            current.append(value)

        current = stack[-1]

        while not text.is_eof():
            text.skip_whitespace()
            next_char = text.read_ahead(0)
            if next_char == "}":
                if len(stack) > 1:
                    stack.pop()
                    current = stack[-1]
                key = None
                text.skip()
                continue
            elif next_char == "]":
                if len(stack) > 1:
                    stack.pop()
                    current = stack[-1]
                text.skip()
                continue
            elif next_char == ",":
                text.skip()
                continue
            break
    return result
