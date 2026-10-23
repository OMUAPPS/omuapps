#pragma once

#include <filesystem>
#include <optional>
#include <string>

#include "../platform/platform.hpp"
#include "../protocol/omu-client.hpp"

class ObsConfig {
public:
	std::optional<ServerAddress> server;
	std::optional<LaunchCommand> launch;

	static ObsConfig load(const Platform &platform);
	static std::optional<std::string> token(const Platform &platform, const ServerAddress &address,
						const std::string &appId);

private:
	static std::filesystem::path directory(const Platform &platform);
	static std::optional<nlohmann::json> read(const std::filesystem::path &path);
};
