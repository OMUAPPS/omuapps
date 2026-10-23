#pragma once

#include <optional>
#include <string>

#include <nlohmann/json.hpp>
#include <obs.h>

class SourceJson {
public:
	static bool isSupported(const std::string &type);
	static std::optional<nlohmann::json> from(obs_sceneitem_t *item);
	static void applyProperties(obs_sceneitem_t *item, const nlohmann::json &source);
};

class SceneJson {
public:
	static nlohmann::json from(obs_scene_t *scene);
};
