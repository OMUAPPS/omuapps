import hashlib
import html
import re
import time

import aiohttp

from . import salt

session_id_regex = r'"web-authorize-session-id":"([\w]+=:\d+:[\w\d]+)"'


async def get_session_id(url: str) -> str:
    async with aiohttp.ClientSession() as session:
        res = await session.get(url)
        match = re.search(session_id_regex, html.unescape(await res.text()))
        if match is None:
            raise Exception("Session ID not found")
        return match.group(1)


async def generate_header(path: str, session_id: str, method="POST") -> dict[str, str]:
    async with aiohttp.ClientSession() as session:
        res = await session.get(
            f"https://twitcasting.tv/js/v1/PlayerPage2.js?{int(time.time())}"
        )
        seed = salt.get_salt(await res.text())
        timestamp = int(time.time())
        text = f"{seed}{timestamp}{method}{path}{session_id}"
        h = hashlib.sha256()
        h.update(text.encode())
        hashed_text = h.hexdigest()
        authorizekey = f"{timestamp}.{hashed_text}"

        return {"x-web-authorizekey": authorizekey, "x-web-sessionid": session_id}


async def get_token(movie_id: int, session_id: str) -> str:
    async with aiohttp.ClientSession() as session:
        path = f"/movies/{movie_id}/token"

        res = await session.post(
            f"https://frontendapi.twitcasting.tv{path}",
            headers={
                "Content-Type": "multipart/form-data",
            }
            | await generate_header(path, session_id),
        )
        if res.status // 100 != 2:
            raise Exception("Failed to get token")
        data = await res.json()
        return data["token"]
