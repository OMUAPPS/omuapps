#pragma once

#include <memory>

#include <nlohmann/json.hpp>

#include "obs/obs-events.hpp"
#include "platform/platform.hpp"
#include "protocol/omu-client.hpp"

class OmuappsPlugin {
public:
	explicit OmuappsPlugin(const Platform &platform);
	~OmuappsPlugin();
	OmuappsPlugin(const OmuappsPlugin &) = delete;
	OmuappsPlugin &operator=(const OmuappsPlugin &) = delete;

	static nlohmann::json app();

private:
	std::shared_ptr<OmuClient> client;
	std::unique_ptr<ObsEvents> events;
};
