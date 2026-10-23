#pragma once

#include <functional>
#include <memory>

#include <obs.h>

class UiThread {
public:
	static void post(std::function<void()> task)
	{
		obs_queue_task(OBS_TASK_UI, &UiThread::run, new std::function<void()>(std::move(task)), false);
	}

private:
	static void run(void *param)
	{
		std::unique_ptr<std::function<void()>> task(static_cast<std::function<void()> *>(param));
		(*task)();
	}
};
