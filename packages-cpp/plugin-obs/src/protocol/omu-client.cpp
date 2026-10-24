#include "omu-client.hpp"

#include <algorithm>
#include <chrono>

#include <ixwebsocket/IXNetSystem.h>
#include <ixwebsocket/IXWebSocket.h>
#include <obs-module.h>

using json = nlohmann::json;

class PacketTypes {
public:
	static constexpr const char *SERVER_META = "core:packet/server_meta";
	static constexpr const char *CONNECT = "core:packet/connect";
	static constexpr const char *DISCONNECT = "core:packet/disconnect";
	static constexpr const char *TOKEN = "core:packet/token";
	static constexpr const char *READY = "core:packet/ready";
	static constexpr const char *ENDPOINT_REGISTER = "ext:endpoint/register";
	static constexpr const char *ENDPOINT_INVOKED = "ext:endpoint/invoked";
	static constexpr const char *ENDPOINT_RESPONSE = "ext:endpoint/response";
	static constexpr const char *SIGNAL_REGISTER = "ext:signal/register";
	static constexpr const char *SIGNAL_NOTIFY = "ext:signal/notify";
};

Responder::Responder(Send send) : send(std::move(send)) {}

void Responder::ok(const Bytes &data) const
{
	send(data, std::nullopt);
}

void Responder::json(const nlohmann::json &data) const
{
	send(ByteStrings::from(data.dump()), std::nullopt);
}

void Responder::error(const std::string &message) const
{
	send({}, message);
}

OmuClient::OmuClient(json app, AddressProvider addresses, TokenProvider tokens)
	: app(std::move(app)),
	  addresses(std::move(addresses)),
	  tokens(std::move(tokens))
{
}

OmuClient::~OmuClient()
{
	stop();
}

void OmuClient::bind(const std::string &id, const std::string &permission, EndpointHandler handler)
{
	endpoints[id] = Endpoint{permission, std::move(handler)};
}

void OmuClient::registerSignal(const std::string &id)
{
	signals.push_back(id);
}

void OmuClient::notify(const std::string &id, const Bytes &body)
{
	{
		std::lock_guard lock(mutex);
		if (!ready)
			return;
	}
	send(PacketTypes::SIGNAL_NOTIFY, ByteWriter().string(id).bytes(body).finish());
}

void OmuClient::start()
{
	std::lock_guard lock(mutex);
	if (running)
		return;
	running = true;
	ix::initNetSystem();
	worker = std::thread([this] { run(); });
}

void OmuClient::stop()
{
	{
		std::lock_guard lock(mutex);
		if (!running)
			return;
		running = false;
	}
	changed.notify_all();
	if (worker.joinable())
		worker.join();
	ix::uninitNetSystem();
}

void OmuClient::run()
{
	int delay = INITIAL_RETRY_MS;
	while (true) {
		{
			std::lock_guard lock(mutex);
			if (!running)
				return;
		}
		std::optional<ServerAddress> address = addresses();
		if (address && session(*address))
			delay = INITIAL_RETRY_MS;
		std::unique_lock lock(mutex);
		changed.wait_for(lock, std::chrono::milliseconds(delay), [this] { return !running; });
		delay = (std::min)(MAX_RETRY_MS, delay * 3 / 2);
	}
}

bool OmuClient::session(const ServerAddress &initial)
{
	auto webSocket = std::make_shared<ix::WebSocket>();
	ServerAddress address = initial;
	std::string host = address.host.empty() ? "127.0.0.1" : address.host;
	webSocket->setUrl("ws://" + host + ":" + std::to_string(address.port) + "/ws");
	webSocket->disableAutomaticReconnection();
	webSocket->disablePerMessageDeflate();
	webSocket->setExtraHeaders({{"Origin", ""}});
	webSocket->setOnMessageCallback([this, &address](const ix::WebSocketMessagePtr &message) {
		if (message->type == ix::WebSocketMessageType::Message && message->binary) {
			try {
				receive(address, message->str);
			} catch (const std::exception &error) {
				blog(LOG_WARNING, "[OMUAPPS] Failed to handle packet: %s", error.what());
			}
			return;
		}
		if (message->type == ix::WebSocketMessageType::Close ||
		    message->type == ix::WebSocketMessageType::Error)
			close();
	});
	{
		std::lock_guard lock(mutex);
		closed = false;
		ready = false;
		socket = webSocket;
	}
	webSocket->start();
	bool wasReady;
	{
		std::unique_lock lock(mutex);
		changed.wait(lock, [this] { return closed || !running; });
		wasReady = ready;
		ready = false;
		socket.reset();
	}
	webSocket->stop();
	return wasReady;
}

void OmuClient::receive(ServerAddress &address, const std::string &message)
{
	Bytes frame(message.begin(), message.end());
	ByteReader reader(frame);
	std::string type = reader.string();
	Bytes data = reader.bytes();
	if (type == PacketTypes::SERVER_META) {
		handshake(address, data);
		return;
	}
	if (type == PacketTypes::READY) {
		{
			std::lock_guard lock(mutex);
			ready = true;
		}
		blog(LOG_INFO, "[OMUAPPS] OBS Plugin %s is ready", OMUAPPS_VERSION);
		return;
	}
	if (type == PacketTypes::ENDPOINT_INVOKED) {
		invoked(data);
		return;
	}
	if (type == PacketTypes::DISCONNECT) {
		json packet = json::parse(ByteStrings::to(data));
		blog(LOG_INFO, "[OMUAPPS] Disconnected: %s", packet.dump().c_str());
		close();
		return;
	}
}

void OmuClient::handshake(ServerAddress &address, const Bytes &data)
{
	json meta = json::parse(ByteStrings::to(data));
	if (meta.contains("hash") && meta["hash"].is_string())
		address.hash = meta["hash"].get<std::string>();
	std::optional<std::string> token = tokens(address, app["id"].get<std::string>());
	if (!token) {
		blog(LOG_WARNING, "[OMUAPPS] No token for %s:%d", address.host.c_str(), address.port);
		close();
		return;
	}
	json connect = {
		{"protocol", {{"version", OMUAPPS_VERSION}}},
		{"app", app},
		{"token", *token},
		{"encryption", nullptr},
	};
	send(PacketTypes::CONNECT, ByteStrings::from(connect.dump()));

	ByteWriter registration;
	registration.uleb128(endpoints.size());
	for (const auto &[id, endpoint] : endpoints)
		registration.string(id).string(endpoint.permission);
	send(PacketTypes::ENDPOINT_REGISTER, registration.finish());

	for (const std::string &id : signals) {
		json signal = {{"id", id}, {"permissions", json::object()}};
		send(PacketTypes::SIGNAL_REGISTER, ByteStrings::from(signal.dump()));
	}
	send(PacketTypes::READY, ByteStrings::from("null"));
	blog(LOG_INFO, "[OMUAPPS] Connected to %s:%d", address.host.c_str(), address.port);
}

void OmuClient::invoked(const Bytes &data)
{
	ByteReader reader(data);
	json params = json::parse(reader.string());
	Bytes request = reader.bytes();
	std::string id = params["id"].get<std::string>();
	uint64_t key = params["key"].get<uint64_t>();
	auto found = endpoints.find(id);
	if (found == endpoints.end()) {
		respond(id, key, {}, "Endpoint not found: " + id);
		return;
	}
	std::weak_ptr<OmuClient> self = weak_from_this();
	Responder responder([self, id, key](const Bytes &body, const std::optional<std::string> &error) {
		if (auto client = self.lock())
			client->respond(id, key, body, error);
	});
	try {
		found->second.handler(request, responder);
	} catch (const std::exception &error) {
		responder.error(error.what());
	}
}

void OmuClient::send(const std::string &type, const Bytes &data)
{
	std::shared_ptr<ix::WebSocket> current;
	{
		std::lock_guard lock(mutex);
		current = socket;
	}
	if (!current)
		return;
	Bytes frame = ByteWriter().string(type).bytes(data).finish();
	current->sendBinary(std::string(frame.begin(), frame.end()));
}

void OmuClient::respond(const std::string &id, uint64_t key, const Bytes &data, const std::optional<std::string> &error)
{
	json params = {{"id", id}, {"key", key}, {"error", error ? json(*error) : json(nullptr)}};
	send(PacketTypes::ENDPOINT_RESPONSE, ByteWriter().string(params.dump()).bytes(data).finish());
}

void OmuClient::close()
{
	{
		std::lock_guard lock(mutex);
		closed = true;
	}
	changed.notify_all();
}
