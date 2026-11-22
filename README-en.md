<br/>
<p align="center">
    <a href="https://omuapps.com">
        <picture>
            <source srcset=".github/splash.svg">
            <img width="200" alt="OMUAPPS" src=".github/splash.svg">
        </picture>
    </a>
</p>
<br/>
<p align="center">
    <a href="https://github.com/OMUAPPS/omuapps/issues">
        <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/OMUAPPS/omuapps">
    </a>
    <a href="https://github.com/OMUAPPS/omuapps/pulls">
        <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues-pr/OMUAPPS/omuapps">
    </a>
    <a href="https://github.com/OMUAPPS/omuapps/blob/master/LICENSE">
        <img alt="GitHub License" src="https://img.shields.io/github/license/OMUAPPS/omuapps">
    </a>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/OMUAPPS/omuapps">
</p>
<br/>

## About OMUAPPS

OMUAPPS is a platform that provides API applications and applications that use the API that strictly limit the functions that cannot be realized between applications and cannot be realized with a browser under restricted permissions.

## Development

How to set up the development environment for OMUAPPS.

This procedure assumes the use of vscode.

### Requirements

Please install the following.

- Install [Rust](https://www.rust-lang.org/)
- Install [bun](https://bun.sh/)

To build the OBS plugin, you also need:

- Install [CMake](https://cmake.org/) 3.28 or later
- Install [Visual Studio 2022](https://visualstudio.microsoft.com/) (Desktop development with C++)

### Setup

Run `bun i`.

```bash
bun i
```

Build the OBS plugin in `packages-cpp/plugin-obs`:

```bash
cmake --preset windows-x64
cmake --build --preset windows-x64
cmake --install build_x64 --prefix release --config RelWithDebInfo
```

### Start

In VS Code, select the [ All ] compound configuration from Run and Debug.
