use tauri::{Manager, Url, WebviewUrl};

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
pub struct CreateWebviewWindowOptions {
    label: String,
    url: String,
    script: String,
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
        "window.close = () => location.href='webview://close'; if (location.hostname === \"{}\") {{ eval(\"{}\") }}",
        sanitize_string_literal(&host),
        sanitize_string_literal(&options.script),
    );

    let label = options.label.clone();
    let handle_clone = state.app_handle.clone();

    tauri::WebviewWindowBuilder::new(&app_handle, &options.label, WebviewUrl::External(url))
        .title(host)
        .initialization_script(&init_script)
        .auto_resize()
        .resizable(true)
        .closable(true)
        .on_navigation(move |url| {
            if url.scheme().eq_ignore_ascii_case("webview") && url.host_str() == Some("close") {
                if let Some(handle) = &*handle_clone.lock().unwrap() {
                    if let Some(view) = handle.get_webview_window(&label) {
                        let _ = view.close();
                    }
                }
                println!("Close!");
            }
            println!("{}", url);
            true
        })
        .build()
        .map_err(|err| err.to_string())?;

    Ok(())
}
