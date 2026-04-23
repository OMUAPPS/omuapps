from __future__ import annotations

import urllib.parse
from typing import TYPE_CHECKING

from omu_chat import content
from omu_chatprovider.errors import ProviderError

if TYPE_CHECKING:
    from .types import accessibility, image, runs


def get_accessibility_label(data: accessibility.Accessibility | None) -> str | None:
    if data is None:
        return None
    return data.get("accessibilityData", {}).get("label", None)


def get_best_thumbnail(thumbnails: list[image.Thumbnail]) -> str:
    if len(thumbnails) == 0:
        raise ProviderError("No thumbnails found")
    best = max(thumbnails, key=lambda x: x.get("width", 0) * x.get("height", 0))
    return normalize_yt_url(best["url"])


def parse_runs(runs: runs.Runs | None) -> content.Component:
    root = content.Root()
    if runs is None:
        return root
    for run in runs.get("runs", []):
        if "text" in run:
            if "navigationEndpoint" in run:
                endpoint = run.get("navigationEndpoint")
                if endpoint is None:
                    root.add(content.Text.of(run["text"]))
                elif "urlEndpoint" in endpoint:
                    url = endpoint["urlEndpoint"]["url"]
                    root.add(content.Link.of(url, content.Text.of(run["text"])))
            else:
                root.add(content.Text.of(run["text"]))
        elif "emoji" in run:
            emoji = run["emoji"]
            image_url = get_best_thumbnail(emoji["image"]["thumbnails"])
            emoji_id = emoji["emojiId"]
            name = emoji["shortcuts"][0] if emoji.get("shortcuts") else None
            root.add(
                content.Image.of(
                    url=image_url,
                    id=emoji_id,
                    name=name,
                )
            )
        else:
            raise ProviderError(f"Unknown run: {run}")
    return root


def normalize_yt_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme or "https"
    host = parsed.netloc or parsed.hostname or "youtube.com"
    path = parsed.path or ""
    query = parsed.query or ""
    if query:
        return f"{scheme}://{host}{path}?{query}"
    return f"{scheme}://{host}{path}"
