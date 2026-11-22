#pragma once

#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

using Bytes = std::vector<uint8_t>;

class ByteWriter {
public:
	ByteWriter &uleb128(uint64_t value);
	ByteWriter &bytes(const Bytes &value);
	ByteWriter &string(std::string_view value);
	Bytes finish();

private:
	Bytes buffer;
};

class ByteReader {
public:
	explicit ByteReader(const Bytes &data);
	uint64_t uleb128();
	Bytes bytes();
	std::string string();

private:
	const Bytes &data;
	size_t offset = 0;
	void require(size_t size) const;
};

class ByteStrings {
public:
	static Bytes from(std::string_view text);
	static std::string to(const Bytes &bytes);
};
