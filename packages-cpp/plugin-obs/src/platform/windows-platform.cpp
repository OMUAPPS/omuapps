#include "platform.hpp"

#include <cstdlib>

#include <Windows.h>
#include <obs-module.h>

class WindowsPlatform : public Platform {
public:
	std::filesystem::path homeDirectory() const override
	{
		const wchar_t *profile = _wgetenv(L"USERPROFILE");
		if (profile && *profile)
			return std::filesystem::path(profile);
		const wchar_t *drive = _wgetenv(L"HOMEDRIVE");
		const wchar_t *path = _wgetenv(L"HOMEPATH");
		return std::filesystem::path(std::wstring(drive ? drive : L"") + (path ? path : L""));
	}

	void launch(const LaunchCommand &command) const override
	{
		if (command.args.empty()) {
			blog(LOG_WARNING, "[OMUAPPS] No arguments in launch command");
			return;
		}
		std::filesystem::path executable = std::filesystem::u8path(command.args.front());
		if (!std::filesystem::is_regular_file(executable)) {
			blog(LOG_WARNING, "[OMUAPPS] Executable %s is not a file", command.args.front().c_str());
			return;
		}
		std::wstring line;
		for (const std::string &arg : command.args) {
			if (!line.empty())
				line += L' ';
			line += quote(std::filesystem::u8path(arg).wstring());
		}
		std::wstring cwd = command.cwd ? std::filesystem::u8path(*command.cwd).wstring() : std::wstring();
		STARTUPINFOW startup{};
		startup.cb = sizeof(startup);
		startup.dwFlags = STARTF_USESHOWWINDOW;
		startup.wShowWindow = SW_HIDE;
		PROCESS_INFORMATION process{};
		if (!CreateProcessW(executable.wstring().c_str(), line.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW,
				    nullptr, cwd.empty() ? nullptr : cwd.c_str(), &startup, &process)) {
			blog(LOG_WARNING, "[OMUAPPS] Failed to launch dashboard: %lu", GetLastError());
			return;
		}
		blog(LOG_INFO, "[OMUAPPS] Launched dashboard with PID %lu", process.dwProcessId);
		CloseHandle(process.hThread);
		CloseHandle(process.hProcess);
	}

private:
	static std::wstring quote(const std::wstring &arg)
	{
		std::wstring quoted = L"\"";
		size_t backslashes = 0;
		for (wchar_t character : arg) {
			if (character == L'\\') {
				backslashes++;
				continue;
			}
			if (character == L'"')
				quoted.append(backslashes * 2 + 1, L'\\');
			else
				quoted.append(backslashes, L'\\');
			backslashes = 0;
			quoted += character;
		}
		quoted.append(backslashes * 2, L'\\');
		quoted += L'"';
		return quoted;
	}
};

const Platform &Platform::current()
{
	static const WindowsPlatform platform;
	return platform;
}
