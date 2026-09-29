use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows::core::w;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, HMENU, WINDOW_STYLE, WS_CHILD, WS_VISIBLE, BS_PUSHBUTTON
};

fn to_wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

// Creates a native Win32 button
pub unsafe fn create_button(
    parent: HWND,
    text: &str,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    id: usize,
) -> HWND {
    let wide_text = to_wide(text);
    unsafe {
        CreateWindowExW(
            Default::default(),
            w!("BUTTON"),
            windows::core::PCWSTR(wide_text.as_ptr()),
            WS_CHILD | WS_VISIBLE | WINDOW_STYLE(BS_PUSHBUTTON as u32),
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
