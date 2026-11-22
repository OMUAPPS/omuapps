use std::sync::Mutex;

use tauri::{webview::Cookie, AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};

pub struct WebviewApiProfile {
    reader_creation: Mutex<()>,
}

impl WebviewApiProfile {
    const READER_LABEL: &'static str = "cookie-reader";

    pub fn new() -> Self {
        Self {
            reader_creation: Mutex::new(()),
        }
    }

    pub fn configure<'a>(
        &self,
        app_handle: &AppHandle,
        builder: WebviewWindowBuilder<'a, Wry, AppHandle>,
    ) -> Result<WebviewWindowBuilder<'a, Wry, AppHandle>, String> {
        #[cfg(target_os = "windows")]
        {
            let data_directory = app_handle
                .path()
                .app_local_data_dir()
                .map_err(|err| err.to_string())?
                .join("webview-api");
            return Ok(builder
                .data_directory(data_directory)
                .additional_browser_args(
                    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-gpu",
                ));
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = app_handle;
            Ok(builder)
        }
    }

    pub fn cookies(&self, app_handle: &AppHandle, url: Url) -> Result<Vec<Cookie<'static>>, String> {
        self.reader(app_handle)?
            .cookies_for_url(url)
            .map_err(|err| err.to_string())
    }

    fn reader(&self, app_handle: &AppHandle) -> Result<WebviewWindow, String> {
        let _creation = self
            .reader_creation
            .lock()
            .map_err(|_| "Failed to lock cookie reader creation".to_string())?;
        if let Some(window) = app_handle.get_webview_window(Self::READER_LABEL) {
            return Ok(window);
        }
        let url = Url::parse("about:blank").map_err(|err| err.to_string())?;
        let builder =
            WebviewWindowBuilder::new(app_handle, Self::READER_LABEL, WebviewUrl::External(url))
                .visible(false)
                .skip_taskbar(true);
        self.configure(app_handle, builder)?
            .build()
            .map_err(|err| err.to_string())
    }
}
