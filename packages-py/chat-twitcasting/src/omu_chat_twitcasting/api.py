import time
from datetime import datetime

import aiohttp
from omu import Omu
from omu_chat.model.channel import Channel
from omu_chat.model.room import Room

from .const import PROVIDER
from .token import get_session_id, get_token
from .types import movieinfo, types


class TwitcastingAPI:
    def __init__(self, omu: Omu, session: aiohttp.ClientSession):
        self.omu = omu
        self.session = session

    async def fetch_room(self, channel: Channel) -> Room:
        user_id = channel.id.path[-1]
        res = await self.session.get(
            "https://twitcasting.tv/streamserver.php",
            params={
                "target": user_id,
                "mode": "client",
                "player": "pc_web",
            },
        )
        stream_server: types.StreamServer = await res.json()
        movie = stream_server["movie"]
        token = await get_token(
            movie["id"],
            await get_session_id(f"https://twitcasting.tv/{user_id}"),
        )
        response = await self.session.get(
            f"https://frontendapi.twitcasting.tv/movies/{movie['id']}/status/viewer",
            params={
                "token": token,
                "__n": int(time.time() * 1000),
            },
        )
        movie_info: movieinfo.MovieInfo = await response.json()
        movie = movie_info["movie"]
        room = Room(
            id=channel.id / str(movie["id"]),
            channel_id=channel.id,
            provider_id=PROVIDER.id,
            connected=False,
            status="offline",
            created_at=datetime.now(),
            metadata={
                "title": movie.get("title", None),
                "description": movie.get("telop", None),
                "thumbnail": f"https://twitcasting.tv/userajax.php?c=updateindexthumbnail&m={movie["id"]}&u={user_id}",
                "url": f"https://twitcasting.tv/{user_id}/movie/{movie["id"]}",
                "viewers": movie["viewers"]["current"],
            },
        )
        return room
