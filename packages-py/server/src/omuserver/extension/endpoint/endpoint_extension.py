from __future__ import annotations

import abc
from typing import TYPE_CHECKING

from loguru import logger
from omu.app import App
from omu.errors import PermissionDenied
from omu.extension.endpoint.endpoint_extension import (
    ENDPOINT_CALL_PACKET,
    ENDPOINT_ERROR_PACKET,
    ENDPOINT_RECEIVE_PACKET,
    ENDPOINT_REGISTER_PACKET,
    EndpointDataPacket,
    EndpointErrorPacket,
    EndpointType,
)
from omu.extension.endpoint.packets import EndpointRegisterPacket
from omu.helper import Coro
from omu.identifier import Identifier

from omuserver.session import Session

if TYPE_CHECKING:
    from omuserver.server import Server


class Endpoint(abc.ABC):
    @property
    @abc.abstractmethod
    def id(self) -> Identifier: ...

    @property
    @abc.abstractmethod
    def permission(self) -> Identifier | None: ...

    @abc.abstractmethod
    async def call(self, data: EndpointDataPacket, session: Session) -> bool: ...


class SessionEndpoint(Endpoint):
    def __init__(
        self,
        session: Session,
        id: Identifier,
        permission: Identifier | None,
    ) -> None:
        self._session = session
        self._id = id
        self._permission = permission

    @property
    def id(self) -> Identifier:
        return self._id

    @property
    def permission(self) -> Identifier | None:
        return self._permission

    async def call(self, data: EndpointDataPacket, session: Session) -> bool:
        if self._session.closed:
            raise RuntimeError(f"Session {self._session.app.key()} already closed")
        await self._session.send(ENDPOINT_CALL_PACKET, data)
        return False


class ServerEndpoint[Req, Res](Endpoint):
    def __init__(
        self,
        server: Server,
        endpoint: EndpointType[Req, Res],
        callback: Coro[[Session, Req], Res],
        permission: Identifier | None = None,
    ) -> None:
        self._server = server
        self._endpoint = endpoint
        self._callback = callback
        self._permission = permission

    @property
    def id(self) -> Identifier:
        return self._endpoint.id

    @property
    def permission(self) -> Identifier | None:
        return self._permission

    async def call(self, data: EndpointDataPacket, session: Session) -> bool:
        if session.closed:
            raise RuntimeError("Session already closed")
        try:
            req = self._endpoint.request_serializer.deserialize(data.data)
            res = await self._callback(session, req)
            serialized = self._endpoint.response_serializer.serialize(res)
            await session.send(
                ENDPOINT_RECEIVE_PACKET,
                EndpointDataPacket(id=data.id, key=data.key, data=serialized),
            )
        except Exception as e:
            await session.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(id=data.id, key=data.key, error=str(e)),
            )
            raise e
        return True


class EndpointCall:
    def __init__(self, session: Session, data: EndpointDataPacket) -> None:
        self._session = session
        self._data = data

    async def receive(self, data: EndpointDataPacket) -> None:
        await self._session.send(ENDPOINT_RECEIVE_PACKET, data)

    async def error(self, error: str) -> None:
        await self._session.send(
            ENDPOINT_ERROR_PACKET,
            EndpointErrorPacket(id=self._data.id, key=self._data.key, error=error),
        )


class EndpointExtension:
    def __init__(self, server: Server) -> None:
        self._server = server
        self._endpoints: dict[Identifier, Endpoint] = {}
        self._calls: dict[tuple[App, Identifier, int], EndpointCall] = {}
        server.packets.register(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_CALL_PACKET,
            ENDPOINT_RECEIVE_PACKET,
            ENDPOINT_ERROR_PACKET,
        )
        server.packets.bind(ENDPOINT_REGISTER_PACKET, self.handle_register)
        server.packets.bind(ENDPOINT_CALL_PACKET, self.handle_call)
        server.packets.bind(ENDPOINT_RECEIVE_PACKET, self.handle_receive)
        server.packets.bind(ENDPOINT_ERROR_PACKET, self.handle_error)

    async def handle_register(self, session: Session, packet: EndpointRegisterPacket) -> None:
        for id, permission in packet.endpoints.items():
            if not id.is_subpath_of(session.app.id):
                msg = f"App {session.app.key()} not allowed to register endpoint {id}"
                raise PermissionDenied(msg)
            self._endpoints[id] = SessionEndpoint(
                session=session,
                id=id,
                permission=permission,
            )

    def bind[Req, Res](
        self,
        type: EndpointType[Req, Res],
        callback: Coro[[Session, Req], Res],
    ) -> None:
        if type.id in self._endpoints:
            raise ValueError(f"Endpoint {type.id.key()} already bound")
        endpoint = ServerEndpoint(
            server=self._server,
            endpoint=type,
            callback=callback,
            permission=type.permission_id,
        )
        self._endpoints[type.id] = endpoint

    def verify_permission(self, endpoint: Endpoint, session: Session):
        if endpoint.id.is_namepath_equal(session.app.id, max_depth=1):
            return
        if endpoint.permission and session.permissions.has(endpoint.permission):
            return
        error = f"{session.app.key()} tried to call endpoint {endpoint.id} without permission {endpoint.permission}"
        logger.warning(error)
        raise PermissionDenied(error)

    async def handle_call(self, session: Session, packet: EndpointDataPacket) -> None:
        endpoint = await self._get_endpoint(packet, session)
        if endpoint is None:
            logger.warning(f"{session.app.key()} tried to call unknown endpoint {packet.id}")
            await session.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(
                    id=packet.id,
                    key=packet.key,
                    error=f"Endpoint {packet.id} not found",
                ),
            )
            return
        self.verify_permission(endpoint, session)

        if await endpoint.call(packet, session):
            return
        key = (session.app, packet.id, packet.key)
        self._calls[key] = EndpointCall(session, packet)

    async def handle_receive(self, session: Session, packet: EndpointDataPacket) -> None:
        key = (session.app, packet.id, packet.key)
        call = self._calls.get(key)
        if call is None:
            await session.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(
                    id=packet.id,
                    key=packet.key,
                    error=f"Endpoint not found {packet.id}",
                ),
            )
            return
        await call.receive(packet)
        del self._calls[key]

    async def handle_error(self, session: Session, packet: EndpointErrorPacket) -> None:
        key = (session.app, packet.id, packet.key)
        call = self._calls.get(key)
        if call is None:
            await session.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(
                    id=packet.id,
                    key=packet.key,
                    error=f"Endpoint {packet.id} not found",
                ),
            )
            return
        await call.error(packet.error)
        del self._calls[key]

    async def _get_endpoint(self, packet: EndpointDataPacket, session: Session) -> Endpoint | None:
        endpoint = self._endpoints.get(packet.id)
        if endpoint is None:
            await session.send(
                ENDPOINT_ERROR_PACKET,
                EndpointErrorPacket(
                    id=packet.id,
                    key=packet.key,
                    error=f"Endpoint {packet.id} not found",
                ),
            )
            logger.warning(f"{session.app.key()} tried to call unconnected endpoint {packet.id}")
            return
        return endpoint
