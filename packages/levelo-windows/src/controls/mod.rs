pub mod button;
pub mod input;
pub mod text;

pub use button::create_button;
pub use input::{create_input, enable_input_shortcuts};
pub use text::create_static;

use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::Graphics::Gdi::{
    CreateFontW, FONT_CHARSET, FONT_CLIP_PRECISION, FONT_OUTPUT_PRECISION, FONT_QUALITY, FW_NORMAL,
};
use windows::Win32::UI::WindowsAndMessaging::{SendMessageW, WM_SETFONT};

fn to_wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

pub unsafe fn apply_modern_font(hwnd: HWND) {
    let font_name = to_wide("Segoe UI");

    let hfont = unsafe {
        CreateFontW(
            -16,
            0,
            0,
            0,
            FW_NORMAL.0 as i32,
            0,
            0,
            0,
            FONT_CHARSET(0),
            FONT_OUTPUT_PRECISION(0),
            FONT_CLIP_PRECISION(0),
            FONT_QUALITY(0),
            0,
            windows::core::PCWSTR(font_name.as_ptr()),
        )
    };

    unsafe {
        SendMessageW(
            hwnd,
            WM_SETFONT,
            Some(WPARAM(hfont.0 as _)),
            Some(LPARAM(1)),
        );
    }
}