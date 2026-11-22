cmake_minimum_required(VERSION 3.28...3.30)

include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/common/bootstrap.cmake" NO_POLICY_SCOPE)

project(${_name} VERSION ${_version})

include(compilerconfig)
include(defaults)
include(helpers)

include(FetchContent)

FetchContent_Declare(
  nlohmann_json
  URL https://github.com/nlohmann/json/releases/download/v3.12.0/json.tar.xz
  URL_HASH SHA256=42f6e95cad6ec532fd372391373363b62a14af6d771056dbfc86160e6dfff7aa
)

set(USE_TLS OFF CACHE BOOL "" FORCE)
set(USE_ZLIB OFF CACHE BOOL "" FORCE)
set(IXWEBSOCKET_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  ixwebsocket
  GIT_REPOSITORY https://github.com/machinezone/IXWebSocket.git
  GIT_TAG v11.4.6
)

FetchContent_MakeAvailable(nlohmann_json ixwebsocket)
set_target_properties(ixwebsocket PROPERTIES COMPILE_WARNING_AS_ERROR OFF)

add_library(${CMAKE_PROJECT_NAME} MODULE)

find_package(libobs REQUIRED)
find_package(obs-frontend-api REQUIRED)
target_link_libraries(
  ${CMAKE_PROJECT_NAME}
  PRIVATE OBS::libobs OBS::obs-frontend-api nlohmann_json::nlohmann_json ixwebsocket
)

target_compile_features(${CMAKE_PROJECT_NAME} PRIVATE cxx_std_20)
target_compile_definitions(
  ${CMAKE_PROJECT_NAME}
  PRIVATE OMUAPPS_VERSION="${_version}" _SILENCE_CXX20_U8PATH_DEPRECATION_WARNING
)

target_sources(
  ${CMAKE_PROJECT_NAME}
  PRIVATE
    src/plugin-main.cpp
    src/omuapps-plugin.cpp
    src/config/obs-config.cpp
    src/protocol/byte-buffer.cpp
    src/protocol/omu-client.cpp
    src/obs/obs-endpoints.cpp
    src/obs/obs-events.cpp
    src/obs/obs-scenes.cpp
    src/obs/source-json.cpp
)

if(OS_WINDOWS)
  target_sources(${CMAKE_PROJECT_NAME} PRIVATE src/platform/windows-platform.cpp)
endif()

set_target_properties_plugin(${CMAKE_PROJECT_NAME} PROPERTIES OUTPUT_NAME ${_name})
