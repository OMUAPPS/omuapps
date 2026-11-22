#pragma once

#include <obs-frontend-api.h>

#include "../protocol/omu-client.hpp"

class ObsEvents {
public:
	static constexpr const char *SIGNAL = "com.omuapps:plugin-obs/event_signal";

	explicit ObsEvents(OmuClient &client);
	~ObsEvents();
	ObsEvents(const ObsEvents &) = delete;
	ObsEvents &operator=(const ObsEvents &) = delete;

	static const char *name(obs_frontend_event event);

private:
	OmuClient &client;

	static void handle(obs_frontend_event event, void *param);
};
