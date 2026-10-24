#pragma once

#include <functional>

#include <nlohmann/json.hpp>
#include <obs.h>

#include "../protocol/omu-client.hpp"

class ObsEndpoints {
public:
	static void bind(OmuClient &client);

private:
	using JsonHandler = std::function<nlohmann::json(const nlohmann::json &request)>;

	static void bindJson(OmuClient &client, const char *name, const char *permission, JsonHandler handler);
	static void screenshot(OmuClient &client);

	static nlohmann::json create(const nlohmann::json &source, const std::string &name);
	static nlohmann::json createBrowser(const nlohmann::json &request, const std::string &name);
	static nlohmann::json remove(obs_source_t *source, const std::string &label);
	static nlohmann::json update(const nlohmann::json &request);
	static nlohmann::json getByName(const nlohmann::json &request);
	static nlohmann::json getByUuid(const nlohmann::json &request);
	static nlohmann::json list(const nlohmann::json &request);
	static nlohmann::json sceneList();
	static nlohmann::json sceneCreate(const nlohmann::json &request);
	static nlohmann::json setCurrent(obs_scene_t *scene);
};
