#pragma once

#include <filesystem>
#include <optional>
#include <string>
#include <vector>

struct LaunchCommand {
	std::vector<std::string> args;
	std::optional<std::string> cwd;
};

class Platform {
public:
	virtual ~Platform() = default;
	virtual std::filesystem::path homeDirectory() const = 0;
	virtual void launch(const LaunchCommand &command) const = 0;

	static const Platform &current();
};
