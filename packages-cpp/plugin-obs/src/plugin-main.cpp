#include <memory>

#include <obs-module.h>

#include "omuapps-plugin.hpp"

OBS_DECLARE_MODULE()

class PluginModule {
public:
	static inline std::unique_ptr<OmuappsPlugin> plugin;
};

bool obs_module_load(void)
{
	blog(LOG_INFO, "[OMUAPPS] Loading OBS Plugin %s", OMUAPPS_VERSION);
	PluginModule::plugin = std::make_unique<OmuappsPlugin>(Platform::current());
	return true;
}

void obs_module_unload(void)
{
	PluginModule::plugin.reset();
}

const char *obs_module_name(void)
{
	return "OMUAPPS";
}

const char *obs_module_description(void)
{
	return "Plugin for OMUAPPS apps to control OBS";
}
