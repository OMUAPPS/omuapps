from typing import Literal, TypedDict


class Sender(TypedDict):
    """
    {
        "id": "namae_id",
        "name": "なまえ名前Name",
        "screenName": "namae_id",
        "profileImage": "https://imagegw02.twitcasting.tv/image3s/pbs.twimg.com/profile_images/([0-9]{19})/3f5ZZuhS_normal.jpg",
        "grade": 0,
        "m": true
    }
    """

    id: str
    name: str
    screenName: str
    profileImage: str
    grade: int


class CommentEvent(TypedDict):
    """
    {
        "type": "comment",
        "id": 12345678901,
        "message": "メッセージMessage",
        "createdAt": 1703125960000,
        "author": Sender,
        "numComments": 78463
    }
    """

    type: Literal["comment"]
    id: int
    message: str
    createdAt: int
    author: Sender
    numComments: int


class Item(TypedDict):
    """
    {
        "name": "お茶",
        "image": "https://s01.twitcasting.tv/img/item_tea.png",
        "detailImage": "",
        "effectCommand": "",
        "showsSenderInfo": true
    }
    """

    name: str
    image: str
    detailImage: str
    effectCommand: str
    showsSenderInfo: bool


class ScoreItem(TypedDict):
    """
    {
        "title": "🍡",
        "text": "2"
    }
    """

    title: str
    text: str


class GiftEvent(TypedDict):
    """
    {
        "id": "012abcdef.0123456789abcdef.12345678",  # [a-f0-9]{8}.[a-f0-9]{16}.[0-9]{8}
        "type": "gift",
        "message": "(+🍡2)",
        "plainMessage": "",
        "item": Item,
        "sender": Sender,
        "createdAt": 1703126345000,
        "score_items": [ScoreItem]
    }
    """

    type: Literal["gift"]
    id: str
    message: str
    plainMessage: str
    item: Item
    sender: Sender
    isForMovie: bool
    isPaidGift: bool
    createdAt: int
    score_items: list[ScoreItem]


Event = CommentEvent | GiftEvent

"""
[Event...]
"""
type EventJson = list[Event]
