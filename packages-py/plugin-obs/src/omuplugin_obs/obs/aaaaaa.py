from pathlib import Path

import obspython

print("raw:", obspython.obs_frontend_get_last_screenshot())
print("type:", type(obspython.obs_frontend_get_last_screenshot()))
print("path:", Path(obspython.obs_frontend_get_last_screenshot()))
