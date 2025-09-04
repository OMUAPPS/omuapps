from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING

from loguru import logger
from omu.api.endpoint.extension import (
    ENDPOINT_INVOKE_PACKET,
    ENDPOINT_INVOKED_PACKET,
    ENDPOINT_REGISTER_PACKET,
    ENDPOINT_RESPONSE_PACKET,
    EndpointType,
)
from omu.api.endpoint.packets import (
    EndpointInvokedPacket,
    EndpointInvokePacket,
    EndpointRegisterPacket,
    EndpointResponsePacket,
    InvokedParams,
    ResponseParams,
)
from omu.api.extension import EXT_NAMESPACE
from omu.app import AppType
from omu.errors import PermissionDenied
from omu.helper import Coro
from omu.identifier import Identifier
from omu.network.packet.packet_types import DisconnectType

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
    async def call(self, data: EndpointInvokedPacket, session: Session) -> Session | None: ...


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

    async def call(self, data: EndpointInvokedPacket, session: Session) -> Session:
        if self._session.closed:
            raise RuntimeError(f"Session {self._session.app.key()} already closed")
        await self._session.send(ENDPOINT_INVOKED_PACKET, data)
        return self._session


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

    async def call(self, data: EndpointInvokedPacket, session: Session) -> None:
        if session.closed:
            raise RuntimeError("Session already closed")
        try:
            req = self._endpoint.request_serializer.deserialize(data.buffer)
            res = await self._callback(session, req)
            serialized = self._endpoint.response_serializer.serialize(res)
            await session.send(
                ENDPOINT_RESPONSE_PACKET,
                EndpointResponsePacket(
                    ResponseParams(
                        id=data.params.id,
                        key=data.params.key,
                        error=None,
                    ),
                    buffer=serialized,
                ),
            )
        except Exception as e:
            await session.send(
                ENDPOINT_RESPONSE_PACKET,
                EndpointResponsePacket(
                    ResponseParams(
                        id=data.params.id,
                        key=data.params.key,
                        error=repr(e),
                    ),
                    buffer=b"",
                ),
            )
            raise e
        return None


@dataclass(frozen=True, slots=True)
class EndpointInvoke:
    caller: Session
    session: Session
    invoke: EndpointInvokedPacket


class EndpointExtension:
    def __init__(self, server: Server) -> None:
        self._server = server
        self._endpoints: dict[Identifier, Endpoint] = {}
        self._invokes: dict[tuple[Identifier, int], EndpointInvoke] = {}
        server.packets.register(
            ENDPOINT_REGISTER_PACKET,
            ENDPOINT_INVOKE_PACKET,
            ENDPOINT_INVOKED_PACKET,
            ENDPOINT_RESPONSE_PACKET,
        )
        server.packets.bind(ENDPOINT_REGISTER_PACKET, self.handle_register)
        server.packets.bind(ENDPOINT_INVOKE_PACKET, self.handle_invoke)
        server.packets.bind(ENDPOINT_RESPONSE_PACKET, self.handle_response)

    async def handle_register(self, session: Session, packet: EndpointRegisterPacket) -> None:
        for id, permission in packet.endpoints.items():
            if not self.is_endpoint_binding_allowed(session, id):
                msg = f"App {session.app.key()} not allowed to register endpoint {id}"
                raise PermissionDenied(msg)
            self._endpoints[id] = SessionEndpoint(
                session=session,
                id=id,
                permission=permission,
            )

    def is_endpoint_binding_allowed(self, session: Session, id: Identifier) -> bool:
        if id.is_subpath_of(session.app.id):
            return True
        if session.kind == AppType.DASHBOARD and id.namespace == EXT_NAMESPACE:
            return True
        return False

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
        if session.is_app_id(endpoint.id):
            return
        if endpoint.permission and session.permissions.has(endpoint.permission):
            return
        error = f"{session.app.key()} tried to call endpoint {endpoint.id} without permission {endpoint.permission}"
        logger.warning(error)
        raise PermissionDenied(error)

    async def handle_invoke(self, session: Session, packet: EndpointInvokePacket) -> None:
        endpoint = self._endpoints.get(packet.params.id)
        if endpoint is None:
            logger.warning(f"{session.app.key()} tried to call unknown endpoint {packet.params.id}")
            await session.send(
                ENDPOINT_RESPONSE_PACKET,
                EndpointResponsePacket(
                    ResponseParams(
                        id=packet.params.id,
                        key=packet.params.key,
                        error=f"Endpoint {packet.params.id} not found",
                    ),
                    buffer=b"",
                ),
            )
            return
        self.verify_permission(endpoint, session)
        invoke = EndpointInvokedPacket(
            InvokedParams(
                id=packet.params.id,
                key=packet.params.key,
                caller=session.app.id,
            ),
            buffer=packet.buffer,
        )
        endpoint_session = await endpoint.call(invoke, session)
        if endpoint_session is None:
            return
        key = (packet.params.id, packet.params.key)
        self._invokes[key] = EndpointInvoke(
            caller=session,
            session=endpoint_session,
            invoke=invoke,
        )

    async def handle_response(self, session: Session, packet: EndpointResponsePacket) -> None:
        key = (packet.params.id, packet.params.key)
        invoke = self._invokes.get(key)
        if invoke is None:
            logger.warning(
                f"{session.app.key()} tried to handle response for unknown call {key} ({packet.params.id.key()})"
            )
            return
        if session != invoke.session:
            await session.disconnect(
                DisconnectType.PERMISSION_DENIED,
                f"Session mismatch for call {key} ({packet.params.id.key()}): {session.app} != {invoke.session.app}",
            )
            return
        del self._invokes[key]
        await invoke.caller.send(ENDPOINT_RESPONSE_PACKET, packet)
