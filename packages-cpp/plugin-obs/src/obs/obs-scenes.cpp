#include "obs-scenes.hpp"

#include <charconv>
#include <stdexcept>

#include <obs-frontend-api.h>

using json = nlohmann::json;

OBSSceneAutoRelease ObsScenes::find(const json &request, const char *key)
{
	if (request.is_object() && request.contains(key) && request[key].is_string() &&
	    !request[key].get<std::string>().empty())
		return byName(request[key].get<std::string>());
	OBSSourceAutoRelease current = obs_frontend_get_current_scene();
	if (!current)
		throw std::runtime_error("No current scene");
	return obs_scene_get_ref(obs_scene_from_source(current));
}

OBSSceneAutoRelease ObsScenes::byName(const std::string &name)
{
	OBSSceneAutoRelease scene = obs_get_scene_by_name(name.c_str());
	if (!scene)
		throw std::runtime_error("Scene with name " + name + " does not exist");
	return scene;
}

OBSSceneAutoRelease ObsScenes::byUuid(const std::string &uuid)
{
	OBSSourceAutoRelease source = obs_get_source_by_uuid(uuid.c_str());
	if (!source)
		throw std::runtime_error("Source with uuid " + uuid + " does not exist");
	if (!obs_source_is_scene(source))
		throw std::runtime_error("Source with uuid " + uuid + " is not a scene");
	return obs_scene_get_ref(obs_scene_from_source(source));
}

bool ObsScenes::exists(const std::string &name)
{
	OBSSourceAutoRelease source = obs_get_source_by_name(name.c_str());
	return source && !obs_source_removed(source);
}

std::string ObsScenes::uniqueName(const std::string &name)
{
	if (!exists(name))
		return name;
	for (int index = 2;; index++) {
		std::string candidate = name + " (" + std::to_string(index) + ")";
		OBSSourceAutoRelease source = obs_get_source_by_name(candidate.c_str());
		if (!source)
			return candidate;
	}
}

obs_sceneitem_t *ObsScenes::add(obs_scene_t *scene, const std::string &type, const std::string &name,
				obs_data_t *settings)
{
	const char *latest = obs_get_latest_input_type_id(type.c_str());
	OBSSourceAutoRelease source = obs_source_create(latest ? latest : type.c_str(), name.c_str(), settings, nullptr);
	if (!source)
		throw std::runtime_error("Failed to create source " + name);
	obs_sceneitem_t *item = obs_scene_add(scene, source);
	if (!item)
		throw std::runtime_error("Failed to add source " + name);
	return item;
}

std::pair<long long, long long> ObsScenes::dimensions(obs_scene_t *scene, const json &request)
{
	obs_source_t *source = obs_scene_get_source(scene);
	long long width = obs_source_get_base_width(source);
	long long height = obs_source_get_base_height(source);
	return {
		dimension(request.value("width", json()), width, width, height, "width"),
		dimension(request.value("height", json()), height, width, height, "height"),
	};
}

long long ObsScenes::dimension(const json &value, long long fallback, long long width, long long height,
			       const char *label)
{
	if (value.is_null())
		return fallback;
	if (value.is_number_integer())
		return value.get<long long>();
	if (value.is_number())
		return static_cast<long long>(value.get<double>());
	if (!value.is_string())
		throw std::runtime_error(std::string("Invalid ") + label + " format: " + value.dump());
	std::string text = value.get<std::string>();
	size_t colon = text.find(':');
	if (colon == std::string::npos || text.find(':', colon + 1) != std::string::npos)
		throw std::runtime_error(std::string("Invalid ") + label + " format: " + text);
	long long number = 0;
	auto [end, error] = std::from_chars(text.data(), text.data() + colon, number);
	if (error != std::errc() || end != text.data() + colon)
		throw std::runtime_error(std::string("Invalid ") + label + " format: " + text);
	std::string unit = text.substr(colon + 1);
	long long base = std::string(label) == "width" ? width : height;
	if (unit == "%")
		return number * base / 100;
	if (unit == "vw")
		return number * width / 100;
	if (unit == "vh")
		return number * height / 100;
	if (unit == "px")
		return number;
	throw std::runtime_error("Unknown unit " + unit + " in " + label + " " + text);
}
