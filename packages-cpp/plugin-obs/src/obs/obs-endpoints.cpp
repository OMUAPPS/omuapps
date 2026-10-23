#include "obs-endpoints.hpp"

#include <fstream>
#include <iterator>
#include <stdexcept>

#include <obs-frontend-api.h>
#include <obs.hpp>

#include "obs-scenes.hpp"
#include "source-json.hpp"
#include "ui-thread.hpp"

using json = nlohmann::json;

class ObsIds {
public:
	static constexpr const char *PLUGIN = "com.omuapps:plugin-obs/";
	static constexpr const char *SOURCE_READ = "com.omuapps:plugin-obs/source/read";
	static constexpr const char *SOURCE_CREATE = "com.omuapps:plugin-obs/source/create";
	static constexpr const char *SOURCE_UPDATE = "com.omuapps:plugin-obs/source/write";
	static constexpr const char *SCENE_READ = "com.omuapps:plugin-obs/scene/read";
	static constexpr const char *SCENE_CREATE = "com.omuapps:plugin-obs/scene/create";
	static constexpr const char *SCENE_SET_CURRENT = "com.omuapps:plugin-obs/scene/set_current";
};

void ObsEndpoints::bind(OmuClient &client)
{
	bindJson(client, "source_create", ObsIds::SOURCE_CREATE, [](const json &request) {
		std::string name = request["name"].get<std::string>();
		if (ObsScenes::exists(name))
			throw std::runtime_error("Source with name " + name + " already exists");
		return create(request, name);
	});
	bindJson(client, "source_add", ObsIds::SOURCE_CREATE, [](const json &request) {
		return create(request, ObsScenes::uniqueName(request["name"].get<std::string>()));
	});
	bindJson(client, "browser_create", ObsIds::SOURCE_CREATE, [](const json &request) {
		std::string name = request["name"].get<std::string>();
		if (ObsScenes::exists(name))
			throw std::runtime_error("Source with name " + name + " already exists");
		return createBrowser(request, name);
	});
	bindJson(client, "browser_add", ObsIds::SOURCE_CREATE, [](const json &request) {
		return createBrowser(request, ObsScenes::uniqueName(request["name"].get<std::string>()));
	});
	bindJson(client, "source_remove_by_name", ObsIds::SOURCE_UPDATE, [](const json &request) {
		std::string name = request["name"].get<std::string>();
		OBSSourceAutoRelease source = obs_get_source_by_name(name.c_str());
		return remove(source, "name " + name);
	});
	bindJson(client, "source_remove_by_uuid", ObsIds::SOURCE_UPDATE, [](const json &request) {
		std::string uuid = request["uuid"].get<std::string>();
		OBSSourceAutoRelease source = obs_get_source_by_uuid(uuid.c_str());
		return remove(source, "uuid " + uuid);
	});
	bindJson(client, "source_update", ObsIds::SOURCE_UPDATE, [](const json &request) { return update(request); });
	bindJson(client, "source_get_by_name", ObsIds::SOURCE_READ,
	     [](const json &request) { return getByName(request); });
	bindJson(client, "source_get_by_uuid", ObsIds::SOURCE_READ,
	     [](const json &request) { return getByUuid(request); });
	bindJson(client, "source_list", ObsIds::SOURCE_READ, [](const json &request) { return list(request); });
	bindJson(client, "scene_list", ObsIds::SCENE_READ, [](const json &) { return sceneList(); });
	bindJson(client, "scene_get_by_name", ObsIds::SCENE_READ, [](const json &request) {
		OBSSceneAutoRelease scene = ObsScenes::find(request, "name");
		return SceneJson::from(scene);
	});
	bindJson(client, "scene_get_by_uuid", ObsIds::SCENE_READ, [](const json &request) {
		OBSSceneAutoRelease scene = ObsScenes::byUuid(request["uuid"].get<std::string>());
		return SceneJson::from(scene);
	});
	bindJson(client, "scene_get_current", ObsIds::SCENE_READ, [](const json &request) {
		OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
		return SceneJson::from(scene);
	});
	bindJson(client, "scene_set_current_by_name", ObsIds::SCENE_SET_CURRENT, [](const json &request) {
		OBSSceneAutoRelease scene = ObsScenes::byName(request["name"].get<std::string>());
		return setCurrent(scene);
	});
	bindJson(client, "scene_set_current_by_uuid", ObsIds::SCENE_SET_CURRENT, [](const json &request) {
		OBSSceneAutoRelease scene = ObsScenes::byUuid(request["uuid"].get<std::string>());
		return setCurrent(scene);
	});
	bindJson(client, "scene_create", ObsIds::SCENE_CREATE, [](const json &request) { return sceneCreate(request); });
	bindJson(client, "screenshot_create", ObsIds::SOURCE_READ, [](const json &) {
		obs_frontend_take_screenshot();
		return json::object();
	});
	screenshot(client);
}

void ObsEndpoints::bindJson(OmuClient &client, const char *name, const char *permission, JsonHandler handler)
{
	client.bind(std::string(ObsIds::PLUGIN) + name, permission,
		    [handler](const Bytes &body, const Responder &responder) {
			    json request = ::json::parse(ByteStrings::to(body));
			    UiThread::post([handler, request, responder] {
				    try {
					    responder.json(handler(request));
				    } catch (const std::exception &error) {
					    responder.error(error.what());
				    }
			    });
		    });
}

void ObsEndpoints::screenshot(OmuClient &client)
{
	client.bind(std::string(ObsIds::PLUGIN) + "screenshot_get_last_binary", ObsIds::SOURCE_READ,
		    [](const Bytes &, const Responder &responder) {
			    UiThread::post([responder] {
				    char *path = obs_frontend_get_last_screenshot();
				    std::string file = path ? path : "";
				    bfree(path);
				    ByteWriter writer;
				    writer.uleb128(1);
				    std::ifstream stream(std::filesystem::u8path(file), std::ios::binary);
				    if (file.empty() || !stream) {
					    responder.ok(writer.uleb128(0).finish());
					    return;
				    }
				    Bytes data((std::istreambuf_iterator<char>(stream)), std::istreambuf_iterator<char>());
				    responder.ok(writer.uleb128(1).bytes(data).finish());
			    });
		    });
}

json ObsEndpoints::create(const json &source, const std::string &name)
{
	if (source.contains("uuid"))
		throw std::runtime_error("uuid is not supported yet");
	std::string type = source["type"].get<std::string>();
	if (!SourceJson::isSupported(type))
		throw std::runtime_error("Source with type " + type + " is not allowed");
	OBSSceneAutoRelease scene = ObsScenes::find(source, "scene");
	std::string data = source.value("data", json::object()).dump();
	OBSDataAutoRelease settings = obs_data_create_from_json(data.c_str());
	obs_sceneitem_t *item = ObsScenes::add(scene, type, name, settings);
	SourceJson::applyProperties(item, source);
	std::optional<json> created = SourceJson::from(item);
	if (!created)
		throw std::runtime_error("Source with type " + type + " is not supported");
	return {{"source", *created}};
}

json ObsEndpoints::createBrowser(const json &request, const std::string &name)
{
	OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
	auto [width, height] = ObsScenes::dimensions(scene, request);
	json data = {{"url", request["url"]}, {"width", width}, {"height", height}};
	if (request.contains("css") && request["css"].is_string())
		data["css"] = request["css"];
	OBSDataAutoRelease settings = obs_data_create_from_json(data.dump().c_str());
	obs_sceneitem_t *item = ObsScenes::add(scene, "browser_source", name, settings);
	SourceJson::applyProperties(item, request);
	std::optional<json> created = SourceJson::from(item);
	if (!created)
		throw std::runtime_error("Source with type browser_source is not supported");
	return {{"source", *created}};
}

json ObsEndpoints::remove(obs_source_t *source, const std::string &label)
{
	if (!source)
		throw std::runtime_error("Source with " + label + " does not exist");
	if (obs_source_removed(source))
		throw std::runtime_error("Source with " + label + " is already removed");
	obs_source_remove(source);
	return json::object();
}

json ObsEndpoints::update(const json &request)
{
	OBSSourceAutoRelease source = request.contains("uuid")
					      ? obs_get_source_by_uuid(request["uuid"].get<std::string>().c_str())
					      : obs_get_source_by_name(request["name"].get<std::string>().c_str());
	if (!source)
		throw std::runtime_error("Source with query " + request.dump() + " does not exist");
	std::string data = request["data"].dump();
	OBSDataAutoRelease settings = obs_data_create_from_json(data.c_str());
	obs_source_update(source, settings);
	OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
	std::string name = obs_source_get_name(source);
	obs_sceneitem_t *item = obs_scene_find_source(scene, name.c_str());
	if (!item)
		throw std::runtime_error("Source with name " + name + " is not in the scene");
	SourceJson::applyProperties(item, request);
	std::optional<json> updated = SourceJson::from(item);
	if (!updated)
		throw std::runtime_error(std::string("Source with type ") + obs_source_get_id(source) + " is not supported");
	return {{"source", *updated}};
}

json ObsEndpoints::getByName(const json &request)
{
	OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
	std::string name = request["name"].get<std::string>();
	obs_sceneitem_t *item = obs_scene_find_source(scene, name.c_str());
	if (!item)
		throw std::runtime_error("Source with name " + name + " does not exist");
	std::optional<json> source = SourceJson::from(item);
	if (!source)
		throw std::runtime_error(std::string("Source with type ") +
					 obs_source_get_id(obs_sceneitem_get_source(item)) + " is not supported");
	return *source;
}

json ObsEndpoints::getByUuid(const json &request)
{
	OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
	std::string uuid = request["uuid"].get<std::string>();
	OBSSourceAutoRelease source = obs_get_source_by_uuid(uuid.c_str());
	if (!source)
		throw std::runtime_error("Source with uuid " + uuid + " does not exist");
	obs_sceneitem_t *item = obs_scene_find_source(scene, obs_source_get_name(source));
	if (!item)
		throw std::runtime_error("Source with uuid " + uuid + " exist but can't get scene item");
	std::optional<json> found = SourceJson::from(item);
	if (!found)
		throw std::runtime_error(std::string("Source with type ") + obs_source_get_id(source) + " is not supported");
	return *found;
}

json ObsEndpoints::list(const json &request)
{
	OBSSceneAutoRelease scene = ObsScenes::find(request, "scene");
	return SceneJson::from(scene)["sources"];
}

json ObsEndpoints::sceneList()
{
	json scenes = json::array();
	obs_frontend_source_list sources = {};
	obs_frontend_get_scenes(&sources);
	for (size_t index = 0; index < sources.sources.num; index++) {
		obs_scene_t *scene = obs_scene_from_source(sources.sources.array[index]);
		if (scene)
			scenes.push_back(SceneJson::from(scene));
	}
	obs_frontend_source_list_free(&sources);
	return {{"scenes", scenes}};
}

json ObsEndpoints::sceneCreate(const json &request)
{
	std::string name = request["name"].get<std::string>();
	OBSSceneAutoRelease existing = obs_get_scene_by_name(name.c_str());
	if (existing)
		throw std::runtime_error("Scene with name " + name + " already exists");
	OBSSceneAutoRelease scene = obs_scene_create(name.c_str());
	obs_source_t *source = obs_scene_get_source(scene);
	return {{"scene", {{"name", obs_source_get_name(source)}, {"uuid", obs_source_get_uuid(source)}, {"sources", json::array()}}}};
}

json ObsEndpoints::setCurrent(obs_scene_t *scene)
{
	obs_frontend_set_current_scene(obs_scene_get_source(scene));
	return json::object();
}
