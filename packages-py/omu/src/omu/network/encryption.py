from __future__ import annotations

import base64
import secrets
from dataclasses import dataclass

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import padding as aes_padding
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from omu.bytebuffer import ByteReader, ByteWriter
from omu.network.packet.packet import Packet, PacketData
from omu.network.packet.packet_types import PACKET_TYPES, RSANumbers

def urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def urlsafe_b64decode(data: str) -> bytes:
    padding_needed = 4 - (len(data) % 4)
    if padding_needed and padding_needed != 4:
        data += "=" * padding_needed
    return base64.urlsafe_b64decode(data)

@dataclass(frozen=True, slots=True)
class Decryptor:
    private: rsa.RSAPrivateKey
    public: rsa.RSAPublicKey

    @classmethod
    def new(cls) -> Decryptor:
        private = rsa.generate_private_key(
            public_exponent=0x010001,
            key_size=4096,
        )
        public = private.public_key()
        return Decryptor(
            private=private,
            public=public,
        )

    def to_request(self) -> RSANumbers:
        numbers = self.public.public_numbers()
        return {
            "e": urlsafe_b64encode(numbers.e.to_bytes((0x010001.bit_length() + 7) // 8, "big")),
            "n": urlsafe_b64encode(numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")),
        }

    def decrypt(self, data: bytes) -> bytes:
        decrypted = self.private.decrypt(
            data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return decrypted

    def decrypt_string(self, data: str) -> str:
        return self.decrypt(urlsafe_b64decode(data)).decode()


@dataclass(frozen=True, slots=True)
class Encryptor:
    public: rsa.RSAPublicKey

    @classmethod
    def new(cls, request: RSANumbers) -> Encryptor:
        public_numbers = rsa.RSAPublicNumbers(
            e=int.from_bytes(urlsafe_b64decode(request["e"])),
            n=int.from_bytes(urlsafe_b64decode(request["n"])),
        )
        return Encryptor(
            public=public_numbers.public_key(),
        )

    def encrypt(self, data: bytes) -> bytes:
        encrypted = self.public.encrypt(
            data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return encrypted

    def encrypt_string(self, data: str) -> str:
        return urlsafe_b64encode(self.encrypt(data.encode()))


@dataclass(slots=True)
class AES:
    key: bytes
    iv: bytes
    cipher: Cipher
    counter: int = 0
    pad = aes_padding.PKCS7(128)

    @classmethod
    def new(cls) -> AES:
        key = secrets.token_bytes(32)
        iv = secrets.token_bytes(16)
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        return AES(key=key, iv=iv, cipher=cipher)

    @classmethod
    def deserialize(cls, aes: str, decryptor: Decryptor) -> AES:
        decrypted = decryptor.decrypt(urlsafe_b64decode(aes))
        with ByteReader(decrypted) as reader:
            key = reader.read_uint8_array()
            iv = reader.read_uint8_array()
        return AES(
            key=key,
            iv=iv,
            cipher=Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend()),
        )

    def serialize(self, encryptor: Encryptor) -> str:
        writer = ByteWriter()
        writer.write_uint8_array(self.key)
        writer.write_uint8_array(self.iv)
        return urlsafe_b64encode(encryptor.encrypt(writer.finish()))

    def encrypt(self, packet_data: PacketData) -> Packet:
        writer = ByteWriter()
        writer.write_string(packet_data.type)
        writer.write_uint8_array(packet_data.data)

        padder = self.pad.padder()
        padded_data = padder.update(writer.finish()) + padder.finalize()
        encryptor = self.cipher.encryptor()
        encrypted = encryptor.update(padded_data) + encryptor.finalize()
        return Packet(PACKET_TYPES.ENCRYPTED_PACKET, encrypted)

    def decrypt(self, packet: Packet[bytes]) -> PacketData:
        decryptor = self.cipher.decryptor()
        decrypted = decryptor.update(packet.data) + decryptor.finalize()
        unpadder = self.pad.unpadder()
        unpadded_data = unpadder.update(decrypted) + unpadder.finalize()

        with ByteReader(unpadded_data) as reader:
            type = reader.read_string()
            data = reader.read_uint8_array()
            return PacketData(type=type, data=data)
