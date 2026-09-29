use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows::core::w;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{GetKeyState, VK_CONTROL};
use windows::Win32::UI::WindowsAndMessaging::{
    CallWindowProcW, CreateWindowExW, GetWindowLongPtrW, HMENU, SendMessageW,
    SetWindowLongPtrW, GWLP_USERDATA, GWLP_WNDPROC, WINDOW_STYLE, WM_CHAR,
    WM_KEYDOWN, WNDPROC, WS_BORDER, WS_CHILD, WS_VISIBLE, ES_AUTOHSCROLL,
};

fn to_wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

pub unsafe fn create_input(
    parent: HWND,
    initial_text: &str,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    id: usize,
) -> HWND {
    let wide_text = to_wide(initial_text);
    unsafe {
        CreateWindowExW(
            Default::default(),
            w!("EDIT"),
            windows::core::PCWSTR(wide_text.as_ptr()),
            WS_CHILD | WS_VISIBLE | WS_BORDER | WINDOW_STYLE(ES_AUTOHSCROLL as u32),
            x,
            y,
            width,
            height,
            Some(parent),
            Some(HMENU(id as *mut _)),
            None,
            None,
        )
        .unwrap_or_default()
    }
}

unsafe extern "system" fn edit_subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM
) -> LRESULT{
    let old_proc = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) };
    let orig_wndproc: WNDPROC = unsafe { std::mem::transmute(old_proc) };

    match msg {
        WM_KEYDOWN => {
            if wparam.0 == 0x41 {
                let ctrl_down = (unsafe { GetKeyState(VK_CONTROL.0 as i32) } as i16 & 0x8000u16 as i16) != 0;

                if ctrl_down {
                    const EM_SETSEL: u32 = 0x00B1;
                    unsafe { SendMessageW(hwnd, EM_SETSEL, Some(WPARAM(0)), Some(LPARAM(-1))) };
                    return LRESULT(0);
                }
            }
        }
        WM_CHAR => {
            if wparam.0 == 1 {
                return LRESULT(0);
            }
        }
        _ => {}
    }

    unsafe { CallWindowProcW(orig_wndproc, hwnd, msg, wparam, lparam) }
}

pub unsafe fn enable_input_shortcuts(hwnd: HWND) {
    let old_proc = unsafe { SetWindowLongPtrW(
        hwnd,
        GWLP_WNDPROC,
        edit_subclass_proc as *const () as isize
    ) };

    unsafe { SetWindowLongPtrW(hwnd, GWLP_USERDATA, old_proc) };
}