#include "source-json.hpp"

#include <array>
#include <stdexcept>
#include <utility>

#include <obs.hpp>

using json = nlohmann::json;

template<typename T, size_t N> class EnumNames {
public:
	constexpr explicit EnumNames(std::array<std::pair<T, const char *>, N> names) : names(names) {}

	const char *name(T value) const
	{
		for (const auto &[candidate, name] : names)
			if (candidate == value)
				return name;
		throw std::runtime_error("Unknown value " + std::to_string(static_cast<int>(value)));
	}

	T value(const std::string &name) const
	{
		for (const auto &[candidate, candidateName] : names)
			if (name == candidateName)
				return candidate;
		throw std::runtime_error("Unknown name " + name);
	}

private:
	std::array<std::pair<T, const char *>, N> names;
};

class ObsNames {
public:
	static constexpr EnumNames<obs_blending_method, 2> BLENDING_METHOD{{{
		{OBS_BLEND_METHOD_DEFAULT, "DEFAULT"},
		{OBS_BLEND_METHOD_SRGB_OFF, "SRGB_OFF"},
	}}};
	static constexpr EnumNames<obs_blending_type, 7> BLENDING_TYPE{{{
		{OBS_BLEND_NORMAL, "NORMAL"},
		{OBS_BLEND_ADDITIVE, "ADDITIVE"},
		{OBS_BLEND_SUBTRACT, "SUBTRACT"},
		{OBS_BLEND_SCREEN, "SCREEN"},
		{OBS_BLEND_MULTIPLY, "MULTIPLY"},
		{OBS_BLEND_LIGHTEN, "LIGHTEN"},
		{OBS_BLEND_DARKEN, "DARKEN"},
	}}};
	static constexpr EnumNames<obs_scale_type, 6> SCALE_TYPE{{{
		{OBS_SCALE_DISABLE, "DISABLE"},
		{OBS_SCALE_POINT, "POINT"},
		{OBS_SCALE_BICUBIC, "BICUBIC"},
		{OBS_SCALE_BILINEAR, "BILINEAR"},
		{OBS_SCALE_LANCZOS, "LANCZOS"},
		{OBS_SCALE_AREA, "AREA"},
	}}};
};

bool SourceJson::isSupported(const std::string &type)
{
	return type == "browser_source" || type == "text_gdiplus";
}

std::optional<json> SourceJson::from(obs_sceneitem_t *item)
{
	obs_source_t *source = obs_sceneitem_get_source(item);
	std::string type = obs_source_get_unversioned_id(source);
	if (!isSupported(type))
		return std::nullopt;
	OBSDataAutoRelease settings = obs_source_get_settings(source);
	obs_source_t *scene = obs_scene_get_source(obs_sceneitem_get_scene(item));
	return json{
		{"type", type},
		{"name", obs_source_get_name(source)},
		{"data", json::parse(obs_data_get_json(settings) ? obs_data_get_json(settings) : "{}")},
		{"uuid", obs_source_get_uuid(source)},
		{"scene", obs_source_get_name(scene)},
		{"blend_properties",
		 {
			 {"blending_method", ObsNames::BLENDING_METHOD.name(obs_sceneitem_get_blending_method(item))},
			 {"blending_mode", ObsNames::BLENDING_TYPE.name(obs_sceneitem_get_blending_mode(item))},
		 }},
		{"scale_properties", {{"scale_filter", ObsNames::SCALE_TYPE.name(obs_sceneitem_get_scale_filter(item))}}},
	};
}

void SourceJson::applyProperties(obs_sceneitem_t *item, const json &source)
{
	if (source.contains("blend_properties")) {
		const json &blend = source["blend_properties"];
		obs_sceneitem_set_blending_method(item,
						  ObsNames::BLENDING_METHOD.value(blend["blending_method"].get<std::string>()));
		obs_sceneitem_set_blending_mode(item, ObsNames::BLENDING_TYPE.value(blend["blending_mode"].get<std::string>()));
	}
	if (source.contains("scale_properties")) {
		const json &scale = source["scale_properties"];
		obs_sceneitem_set_scale_filter(item, ObsNames::SCALE_TYPE.value(scale["scale_filter"].get<std::string>()));
	}
}

json SceneJson::from(obs_scene_t *scene)
{
	json sources = json::array();
	obs_scene_enum_items(
		scene,
		[](obs_scene_t *, obs_sceneitem_t *item, void *param) {
			if (obs_source_removed(obs_sceneitem_get_source(item)))
				return true;
			if (std::optional<json> source = SourceJson::from(item))
				static_cast<json *>(param)->push_back(*source);
			return true;
		},
		&sources);
	obs_source_t *source = obs_scene_get_source(scene);
	return json{
		{"name", obs_source_get_name(source)},
		{"uuid", obs_source_get_uuid(source)},
		{"sources", sources},
	};
}
