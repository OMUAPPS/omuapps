#include "omuapps-plugin.hpp"

#include "config/obs-config.hpp"
#include "obs/obs-endpoints.hpp"

using json = nlohmann::json;

OmuappsPlugin::OmuappsPlugin(const Platform &platform)
{
	ObsConfig config = ObsConfig::load(platform);
	if (config.launch)
		platform.launch(*config.launch);
	client = std::make_shared<OmuClient>(
		app(), [&platform] { return ObsConfig::load(platform).server; },
		[&platform](const ServerAddress &address, const std::string &appId) {
			return ObsConfig::token(platform, address, appId);
		});
	ObsEndpoints::bind(*client);
	events = std::make_unique<ObsEvents>(*client);
	client->start();
}

OmuappsPlugin::~OmuappsPlugin()
{
	events.reset();
	client->stop();
}

json OmuappsPlugin::app()
{
	return {
		{"id", "com.omuapps:plugin-obs"},
		{"version", OMUAPPS_VERSION},
		{"metadata",
		 {
			 {"locale", "en"},
			 {"name", {{"ja", "OBSプラグイン"}, {"en", "OBS Plugin"}}},
			 {"description",
			  {{"ja", "アプリがOBSを制御するためのプラグイン"}, {"en", "Plugin for app to control OBS"}}},
		 }},
	};
}
