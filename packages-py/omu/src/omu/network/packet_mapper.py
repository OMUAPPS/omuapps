from omu.errors import InvalidPacket
from omu.identifier import Identifier
from omu.serializer import Serializable

from .packet import Packet, PacketData, PacketType


class PacketMapper(Serializable[Packet, PacketData]):
    def __init__(self) -> None:
        self._map: dict[Identifier, PacketType] = {}

    def register(self, *packet_types: PacketType) -> None:
        for packet_type in packet_types:
            if self._map.get(packet_type.id):
                raise ValueError(f"Packet id {packet_type.id} already registered")
            self._map[packet_type.id] = packet_type

    def serialize(self, item: Packet) -> PacketData:
        return PacketData(
            type=item.type.id.key(),
            data=item.type.serializer.serialize(item.data),
        )

    def deserialize(self, item: PacketData) -> Packet:
        id = Identifier.from_key(item.type)
        packet_type = self._map.get(id)
        if not packet_type:
            raise InvalidPacket(f"Packet type {id} not registered")
        try:
            data = packet_type.serializer.deserialize(item.data)
        except Exception as e:
            raise InvalidPacket("Failed to deserialize packet data") from e
        return Packet(
            type=packet_type,
            data=data,
        )
