if __name__ == "omuapps_plugin":
    import importlib

    importlib.invalidate_caches()

    import venv_loader  # type: ignore

    venv_loader.try_load()


from omuplugin_obs.script import obsplugin


def script_load(settings):
    obsplugin.config.setup_logger()
    obsplugin.config.launch_server()
    obsplugin.script_load()


def script_unload():
    obsplugin.script_unload()


def script_description():
    return "OMUAPPS Plugin"
