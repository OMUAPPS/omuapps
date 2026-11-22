#include "byte-buffer.hpp"

#include <stdexcept>

ByteWriter &ByteWriter::uleb128(uint64_t value)
{
	while (value > 0x7f) {
		buffer.push_back(static_cast<uint8_t>((value & 0x7f) | 0x80));
		value >>= 7;
	}
	buffer.push_back(static_cast<uint8_t>(value));
	return *this;
}

ByteWriter &ByteWriter::bytes(const Bytes &value)
{
	uleb128(value.size());
	buffer.insert(buffer.end(), value.begin(), value.end());
	return *this;
}

ByteWriter &ByteWriter::string(std::string_view value)
{
	return bytes(ByteStrings::from(value));
}

Bytes ByteWriter::finish()
{
	return std::move(buffer);
}

ByteReader::ByteReader(const Bytes &data) : data(data) {}

uint64_t ByteReader::uleb128()
{
	uint64_t value = 0;
	int shift = 0;
	while (true) {
		require(1);
		uint8_t byte = data[offset++];
		value |= static_cast<uint64_t>(byte & 0x7f) << shift;
		if ((byte & 0x80) == 0)
			return value;
		shift += 7;
		if (shift >= 64)
			throw std::runtime_error("ULEB128 value is too large");
	}
}

Bytes ByteReader::bytes()
{
	size_t size = static_cast<size_t>(uleb128());
	require(size);
	Bytes value(data.begin() + offset, data.begin() + offset + size);
	offset += size;
	return value;
}

std::string ByteReader::string()
{
	return ByteStrings::to(bytes());
}

void ByteReader::require(size_t size) const
{
	if (data.size() - offset < size)
		throw std::runtime_error("Unexpected end of packet");
}

Bytes ByteStrings::from(std::string_view text)
{
	return Bytes(text.begin(), text.end());
}

std::string ByteStrings::to(const Bytes &bytes)
{
	return std::string(bytes.begin(), bytes.end());
}
