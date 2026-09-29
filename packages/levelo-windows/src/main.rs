mod controls;
mod registry;

use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::{GetStockObject, HBRUSH, HDC, WHITE_BRUSH, SetBkMode, TRANSPARENT};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CS_HREDRAW, CS_VREDRAW, CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, MSG,
    PostQuitMessage, RegisterClassW, SW_SHOW, ShowWindow, TranslateMessage, WM_COMMAND, WM_DESTROY,
    WNDCLASSW, WS_OVERLAPPEDWINDOW, WM_CTLCOLORSTATIC,
};
use windows::core::{Result, w};

// Main Window Procedure callback
unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_COMMAND => {
            let control_id = (wparam.0 & 0xffff) as usize;
            println!(
                "LeveloJS Engine: Event received from Control ID -> {}",
                control_id
            );
            LRESULT(0)
        }
        WM_CTLCOLORSTATIC => {
            let hdc = HDC(wparam.0 as _);
            unsafe { 
                SetBkMode(hdc, TRANSPARENT);
                LRESULT(GetStockObject(WHITE_BRUSH).0 as _)
            }
        }
        WM_DESTROY => {
            unsafe { PostQuitMessage(0) };
            LRESULT(0)
        }
        _ => unsafe { DefWindowProcW(hwnd, msg, wparam, lparam) },
    }
}

fn main() -> Result<()> {
    unsafe {
        let instance = GetModuleHandleW(None)?;
        let class_name = w!("LeveloWindowsEngine");

        let wc = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(window_proc),
            hInstance: instance.into(),
            lpszClassName: class_name,
            hbrBackground: HBRUSH(GetStockObject(WHITE_BRUSH).0),
            ..Default::default()
        };

        RegisterClassW(&wc);

        let main_hwnd = CreateWindowExW(
            Default::default(),
            class_name,
            w!("LeveloJS Native Windows Engine"),
            WS_OVERLAPPEDWINDOW,
            100,
            100,
            1200,
            800,
            None,
            None,
            Some(instance.into()),
            None,
        )?;

        let _ = ShowWindow(main_hwnd, SW_SHOW);

        let _btn = controls::create_button(main_hwnd, "Click Me", 50, 50, 120, 35, 1);
        let _lbl =
            controls::create_static(main_hwnd, "Levelo Engine - Pure Win32", 50, 100, 220, 25, 2);
        let _inp = controls::create_input(main_hwnd, "Type something here...", 50, 140, 220, 30, 3);

        controls::apply_modern_font(_btn);
        controls::apply_modern_font(_lbl);
        controls::apply_modern_font(_inp);
        controls::enable_input_shortcuts(_inp);

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(())
}
