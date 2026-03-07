use tauri::{Emitter, Manager, Url, WebviewUrl};

use crate::AppState;

#[derive(serde::Deserialize)]
pub struct GetCookiesOptions {
    label: String,
    url: String,
}

#[derive(serde::Serialize)]
pub struct Cookie {
    name: String,
    value: String,
}

#[derive(serde::Serialize)]
#[serde(tag = "type")]
pub enum GetCookiesError {
    AppHandleError { msg: String },
    NoAppHandle { msg: String },
    NoWindow { msg: String },
    InvalidUrl { msg: String },
    FailedToGetCookies { msg: String },
}

#[tauri::command]
pub async fn get_cookies(
    state: tauri::State<'_, AppState>,
    options: GetCookiesOptions,
) -> Result<Vec<Cookie>, GetCookiesError> {
    let app_handle_mutex =
        state
            .app_handle
            .lock()
            .map_err(|_| GetCookiesError::AppHandleError {
                msg: "Failed to lock app handle".to_string(),
            })?;
    let app_handle = app_handle_mutex
        .as_ref()
        .ok_or_else(|| GetCookiesError::NoAppHandle {
            msg: "App handle is not initialized".to_string(),
        })?;
    let window = app_handle
        .get_webview_window(&options.label)
        .ok_or_else(|| GetCookiesError::NoWindow {
            msg: format!("No window with label: {}", options.label),
        })?;
    let url = Url::parse(&options.url).map_err(|err| GetCookiesError::InvalidUrl {
        msg: format!("Invalid URL: {}", err),
    })?;
    let cookies =
        window
            .cookies_for_url(url)
            .map_err(|err| GetCookiesError::FailedToGetCookies {
                msg: format!("Failed to get cookies: {}", err),
            })?;
    let cookies: Vec<Cookie> = cookies
        .iter()
        .map(|cookie| Cookie {
            name: cookie.name().to_string(),
            value: cookie.value().to_string(),
        })
        .collect();
    Ok(cookies)
}

#[derive(serde::Deserialize, Clone)]
pub struct Vec2f64 {
    x: f64,
    y: f64,
}

#[derive(serde::Deserialize, Clone)]
pub struct CreateWebviewWindowOptions {
    label: String,
    url: String,
    script: Option<String>,
    center: Option<bool>,
    position: Option<Vec2f64>,
    inner_size: Option<Vec2f64>,
    min_inner_size: Option<Vec2f64>,
    max_inner_size: Option<Vec2f64>,
    resizable: Option<bool>,
    maximizable: Option<bool>,
    minimizable: Option<bool>,
    title: Option<String>,
    maximized: Option<bool>,
    always_on_bottom: Option<bool>,
    always_on_top: Option<bool>,
    shadow: Option<bool>,
    decorations: Option<bool>,
    transparent: Option<bool>,
}

fn sanitize_string_literal(str: &String) -> String {
    return str
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n");
}

#[tauri::command]
pub async fn create_webview_window(
    state: tauri::State<'_, AppState>,
    options: CreateWebviewWindowOptions,
) -> Result<(), String> {
    let app_handle = state
        .app_handle
        .lock()
        .unwrap()
        .as_ref()
        .ok_or("App handle is not initialized")?
        .clone();

    let url = Url::parse(&options.url).map_err(|err| err.to_string())?;
    let host = url.host_str().unwrap().to_string();
    let init_script = format!(
"if (location.hostname === \"{}\") {{
    window.close = () => location.href='webview://close';
    window.webview = {{
        emit: async (data) => await window.__TAURI_INTERNALS__.invoke(\"plugin:event|emit\", {{event: \"message\", payload: data}}, undefined),
        startResizing: async (side) => await window.__TAURI_INTERNALS__.invoke(\"plugin:window|start_resize_dragging\", {{label: __TAURI_INTERNALS__.metadata.currentWindow.label, value: side}}, undefined),
    }}
    eval(\"{}\");
}}",
        sanitize_string_literal(&host),
        sanitize_string_literal(&options.script.unwrap_or_else(|| "".to_string())),
    );

    let label = options.label.clone();
    let handle = state.app_handle.clone();

    let mut builder =
        tauri::WebviewWindowBuilder::new(&app_handle, &options.label, WebviewUrl::External(url))
            .title(host)
            .initialization_script(&init_script)
            .auto_resize()
            .resizable(true)
            .closable(true)
            .on_navigation(move |url| {
                if !url.scheme().eq_ignore_ascii_case("webview") {
                    return true;
                }
                if let Some(handle) = &*handle.lock().unwrap() {
                    if url.host_str() == Some("close") {
                        if let Some(view) = handle.get_webview_window(&label) {
                            let _ = view.close();
                        }
                    }
                }
                true
            });

    if let Some(center) = options.center {
        if center {
            builder = builder.center();
        }
    }
    if let Some(position) = options.position {
        builder = builder.position(position.x, position.y);
    }
    if let Some(inner_size) = options.inner_size {
        builder = builder.inner_size(inner_size.x, inner_size.y);
    }
    if let Some(min_inner_size) = options.min_inner_size {
        builder = builder.min_inner_size(min_inner_size.x, min_inner_size.y);
    }
    if let Some(max_inner_size) = options.max_inner_size {
        builder = builder.max_inner_size(max_inner_size.x, max_inner_size.y);
    }
    if let Some(resizable) = options.resizable {
        builder = builder.resizable(resizable);
    }
    if let Some(maximizable) = options.maximizable {
        builder = builder.maximizable(maximizable);
    }
    if let Some(minimizable) = options.minimizable {
        builder = builder.minimizable(minimizable);
    }
    if let Some(title) = options.title {
        builder = builder.title(&title);
    }
    if let Some(maximized) = options.maximized {
        builder = builder.maximized(maximized);
    }
    if let Some(always_on_bottom) = options.always_on_bottom {
        builder = builder.always_on_bottom(always_on_bottom);
    }
    if let Some(always_on_top) = options.always_on_top {
        builder = builder.always_on_top(always_on_top);
    }
    if let Some(shadow) = options.shadow {
        builder = builder.shadow(shadow);
    }
    if let Some(decorations) = options.decorations {
        builder = builder.decorations(decorations);
    }
    #[cfg(target_os = "windows")]
    if let Some(transparent) = options.transparent {
        builder = builder.transparent(transparent);
    }

    builder.build().map_err(|err| err.to_string())?;

    Ok(())
}
