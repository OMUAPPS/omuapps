#include "obs-config.hpp"

#include <fstream>
#include <sstream>

#include <obs-module.h>

using json = nlohmann::json;

ObsConfig ObsConfig::load(const Platform &platform)
{
	ObsConfig config;
	std::optional<json> data = read(directory(platform) / "obs_config.json");
	if (!data || !data->is_object())
		return config;
	if (data->contains("server") && (*data)["server"].is_object()) {
		const json &server = (*data)["server"];
		ServerAddress address{server.value("host", std::string()), server.value("port", 0), std::nullopt};
		if (server.contains("hash") && server["hash"].is_string())
			address.hash = server["hash"].get<std::string>();
		if (address.port > 0)
			config.server = address;
	}
	if (data->contains("launch") && (*data)["launch"].is_object()) {
		const json &launch = (*data)["launch"];
		LaunchCommand command;
		command.args = launch.value("args", std::vector<std::string>());
		if (launch.contains("cwd") && launch["cwd"].is_string())
			command.cwd = launch["cwd"].get<std::string>();
		config.launch = command;
	}
	return config;
}

std::optional<std::string> ObsConfig::token(const Platform &platform, const ServerAddress &address,
					     const std::string &appId)
{
	std::optional<json> tokens = read(directory(platform) / "token.json");
	if (!tokens || !tokens->is_object())
		return std::nullopt;
	std::string key = address.host + ":" + std::to_string(address.port) + ":" + address.hash.value_or("") + ":" +
			  appId;
	auto found = tokens->find(key);
	if (found == tokens->end() || !found->is_string())
		return std::nullopt;
	return found->get<std::string>();
}

std::filesystem::path ObsConfig::directory(const Platform &platform)
{
	return platform.homeDirectory() / ".omuapps";
}

std::optional<json> ObsConfig::read(const std::filesystem::path &path)
{
	std::ifstream file(path, std::ios::binary);
	if (!file)
		return std::nullopt;
	std::stringstream buffer;
	buffer << file.rdbuf();
	json data = json::parse(buffer.str(), nullptr, false);
	if (data.is_discarded()) {
		blog(LOG_WARNING, "[OMUAPPS] Failed to parse %s", path.u8string().c_str());
		return std::nullopt;
	}
	return data;
}
