mod controls;

use controls::create_button;
use windows::core::{w, Result};
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW,
    DefWindowProcW,
    DispatchMessageW,
    GetMessageW,
    PostQuitMessage,
    RegisterClassW,
    ShowWindow,
    TranslateMessage,
    CS_HREDRAW,
    CS_VREDRAW,
    MSG,
    SW_SHOW,
    WM_COMMAND,
    WM_DESTROY,
    WNDCLASSW,
    WS_OVERLAPPEDWINDOW
};
use windows::Win32::Graphics::Gdi::{GetStockObject, HBRUSH, WHITE_BRUSH};

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
            println!("LeveloJS Engine: Event received from Control ID -> {}", control_id);
            LRESULT(0)
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
            None
        )?;

        let _ = ShowWindow(main_hwnd, SW_SHOW);

        let _btn1 = create_button("Button id 1", 50, 50, 160, 40, main_hwnd, 1)?;
        let _btn2 = create_button("Button id 2", 50, 110, 160, 40, main_hwnd, 2)?;

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    Ok(())
}