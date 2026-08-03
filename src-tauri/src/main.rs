#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::ShellExt;

const HOST: &str = "127.0.0.1";
// ponytail: fixed local port; allocate dynamically if multi-instance desktop use is introduced
const PORT: u16 = 3210;
const INITIAL_OWNER_PASSWORD_HASH: &str = "scrypt$hairhaeyo-owner-demo$03e3617a25194e3bdb1d1758c9d1075836df1c6d2f85e657a5741ce643ae86ea73b13eeacdf34dda0fbc66d03639cbc8bbf37aa69549cb44ed92a44c7a232549";

fn session_secret() -> std::io::Result<String> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| std::io::Error::other(format!("OS random failed: {error:?}")))?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn wait_until_ready(address: SocketAddr, health_token: &str, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(100)) {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(250)));
            let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
            let request = format!("GET /api/health HTTP/1.1\r\nHost: {HOST}:{PORT}\r\nConnection: close\r\nX-Hairhaeyo-Health: {health_token}\r\n\r\n");
            let mut response = [0_u8; 128];
            if stream.write_all(request.as_bytes()).is_ok()
                && stream.read(&mut response).is_ok_and(|size| String::from_utf8_lossy(&response[..size]).starts_with("HTTP/1.1 204"))
            {
                return true;
            }
        }
        thread::sleep(Duration::from_millis(50));
    }
    false
}

fn main() {
    let sidecar = Arc::new(Mutex::new(None));
    let setup_sidecar = Arc::clone(&sidecar);
    let exit_sidecar = Arc::clone(&sidecar);
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let window = app.get_webview_window("main").expect("main window missing");
            if cfg!(debug_assertions) {
                window.show()?;
                return Ok(());
            }

            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;
            let server_dir = app.path().resource_dir()?.join("server");
            let session_secret_value = session_secret()?;
            let health_token = session_secret()?;
            let (_events, child) = app
                .shell()
                .sidecar("node")?
                .args(["server.js"])
                .current_dir(server_dir)
                .env("HOSTNAME", HOST)
                .env("PORT", PORT.to_string())
                .env("HAIRHAEYO_DB_PATH", app_data.join("hairhaeyo.sqlite"))
                .env("HAIRHAEYO_OWNER_PASSWORD_HASH", INITIAL_OWNER_PASSWORD_HASH)
                .env("HAIRHAEYO_SESSION_SECRET", session_secret_value)
                .env("HAIRHAEYO_HEALTH_TOKEN", &health_token)
                .spawn()?;
            *setup_sidecar.lock().expect("sidecar state poisoned") = Some(child);

            let address = format!("{HOST}:{PORT}").parse().expect("fixed loopback address");
            if !wait_until_ready(address, &health_token, Duration::from_secs(15)) {
                if let Some(child) = setup_sidecar.lock().expect("sidecar state poisoned").take() {
                    let _ = child.kill();
                }
                return Err("Next sidecar did not become ready".into());
            }
            window.navigate(format!("http://{HOST}:{PORT}").parse()?)?;
            window.show()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build Hairhaeyo");

    app.run(move |_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            if let Some(child) = exit_sidecar.lock().expect("sidecar state poisoned").take() {
                let _ = child.kill();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{session_secret, wait_until_ready};
    use std::{io::{Read, Write}, net::TcpListener, thread, time::Duration};

    #[test]
    fn detects_the_authenticated_hairhaeyo_server() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let size = stream.read(&mut request).unwrap();
            let status = if String::from_utf8_lossy(&request[..size]).contains("X-Hairhaeyo-Health: task9-health-token") { "204 No Content" } else { "403 Forbidden" };
            stream.write_all(format!("HTTP/1.1 {status}\r\nConnection: close\r\n\r\n").as_bytes()).unwrap();
        });

        assert!(wait_until_ready(address, "task9-health-token", Duration::from_millis(250)));
    }

    #[test]
    fn rejects_an_unrelated_loopback_server() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let _ = stream.read(&mut request);
            stream.write_all(b"HTTP/1.1 200 OK\r\nConnection: close\r\n\r\nnot Hairhaeyo").unwrap();
        });

        assert!(!wait_until_ready(address, "task9-health-token", Duration::from_millis(100)));
    }

    #[test]
    fn creates_a_random_256_bit_session_secret() {
        let first = session_secret().unwrap();
        let second = session_secret().unwrap();

        assert_eq!(first.len(), 64);
        assert!(first.bytes().all(|byte| byte.is_ascii_hexdigit()));
        assert_ne!(first, second);
    }
}
