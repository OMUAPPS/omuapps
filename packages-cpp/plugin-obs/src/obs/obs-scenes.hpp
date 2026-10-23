#pragma once

#include <string>
#include <utility>

#include <nlohmann/json.hpp>
#include <obs.hpp>

class ObsScenes {
public:
	static OBSSceneAutoRelease find(const nlohmann::json &request, const char *key);
	static OBSSceneAutoRelease byName(const std::string &name);
	static OBSSceneAutoRelease byUuid(const std::string &uuid);
	static bool exists(const std::string &name);
	static std::string uniqueName(const std::string &name);
	static obs_sceneitem_t *add(obs_scene_t *scene, const std::string &type, const std::string &name,
				    obs_data_t *settings);
	static std::pair<long long, long long> dimensions(obs_scene_t *scene, const nlohmann::json &request);

private:
	static long long dimension(const nlohmann::json &value, long long fallback, long long width, long long height,
				   const char *label);
};
