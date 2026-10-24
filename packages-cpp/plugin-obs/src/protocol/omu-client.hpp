#pragma once

#include <condition_variable>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include <nlohmann/json.hpp>

#include "byte-buffer.hpp"

namespace ix {
class WebSocket;
}

struct ServerAddress {
	std::string host;
	int port;
	std::optional<std::string> hash;
};

class Responder {
public:
	using Send = std::function<void(const Bytes &data, const std::optional<std::string> &error)>;

	explicit Responder(Send send);
	void ok(const Bytes &data) const;
	void json(const nlohmann::json &data) const;
	void error(const std::string &message) const;

private:
	Send send;
};

using EndpointHandler = std::function<void(const Bytes &request, const Responder &responder)>;

class OmuClient : public std::enable_shared_from_this<OmuClient> {
public:
	using AddressProvider = std::function<std::optional<ServerAddress>()>;
	using TokenProvider = std::function<std::optional<std::string>(const ServerAddress &address, const std::string &appId)>;

	OmuClient(nlohmann::json app, AddressProvider addresses, TokenProvider tokens);
	~OmuClient();

	void bind(const std::string &id, const std::string &permission, EndpointHandler handler);
	void registerSignal(const std::string &id);
	void notify(const std::string &id, const Bytes &body);
	void start();
	void stop();

private:
	static constexpr int INITIAL_RETRY_MS = 500;
	static constexpr int MAX_RETRY_MS = 30000;

	struct Endpoint {
		std::string permission;
		EndpointHandler handler;
	};

	const nlohmann::json app;
	const AddressProvider addresses;
	const TokenProvider tokens;
	std::map<std::string, Endpoint> endpoints;
	std::vector<std::string> signals;

	std::mutex mutex;
	std::condition_variable changed;
	std::thread worker;
	bool running = false;
	bool closed = false;
	bool ready = false;
	std::shared_ptr<ix::WebSocket> socket;

	void run();
	bool session(const ServerAddress &address);
	void receive(ServerAddress &address, const std::string &message);
	void handshake(ServerAddress &address, const Bytes &data);
	void invoked(const Bytes &data);
	void send(const std::string &type, const Bytes &data);
	void respond(const std::string &id, uint64_t key, const Bytes &data, const std::optional<std::string> &error);
	void close();
};
