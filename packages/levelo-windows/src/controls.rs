use windows::core::{w, PCWSTR, Result};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, HMENU, WS_CHILD, WS_VISIBLE,
};

// Creates a native Win32 button tied to a numeric ID
pub unsafe fn create_button(
    text: &str,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    parent: HWND,
    id: usize,
) -> Result<HWND> {
    let wide_text: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        CreateWindowExW(
            Default::default(),
            w!("BUTTON"),
            PCWSTR(wide_text.as_ptr()),
            WS_CHILD | WS_VISIBLE,
            x,
            y,
            width,
            height,
            Some(parent),
            Some(HMENU(id as _)),
            None,
            None,
        )
    }
}