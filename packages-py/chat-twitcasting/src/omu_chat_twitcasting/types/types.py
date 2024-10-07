from typing import TypedDict


class Movie(TypedDict):
    id: int
    live: bool


class Hls(TypedDict):
    host: str
    proto: str
    source: bool


class Fmp4(TypedDict):
    host: str
    proto: str
    source: bool
    mobilesource: bool


class Streams(TypedDict):
    main: str
    base: str


class Llfmp4(TypedDict):
    streams: Streams


class StreamServer(TypedDict):
    movie: Movie
    hls: Hls
    fmp4: Fmp4
    llfmp4: Llfmp4


class EventPubSubUrl(TypedDict):
    url: str
