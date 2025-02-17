from typing import TypedDict


class Category(TypedDict):
    id: str
    name: str


class Viewers(TypedDict):
    current: int
    total: int


class Movie(TypedDict):
    id: int
    title: str
    telop: str
    category: Category
    viewers: Viewers
    hashtag: str
    pin_message: str


class MovieInfo(TypedDict):
    update_interval_sec: int
    movie: Movie
