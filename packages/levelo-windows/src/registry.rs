use crate::controls;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::SetWindowTextW;

pub struct WindowsNodeRegistry {
    nodes: HashMap<usize, HWND>,
    parent_window: HWND,
}

impl WindowsNodeRegistry {
    pub fn new(parent_window: HWND) -> Self {
        Self {
            nodes: HashMap::new(),
            parent_window,
        }
    }

    pub fn create_element(
        &mut self,
        id: usize,
        tag: &str,
        text: &str,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
    ) {
        let hwnd = unsafe {
            match tag {
                "button" => {
                    controls::create_button(self.parent_window, text, x, y, width, height, id)
                }
                "input" => {
                    controls::create_input(self.parent_window, text, x, y, width, height, id)
                }
                _ => controls::create_static(self.parent_window, text, x, y, width, height, id),
            }
        };

        if !hwnd.0.is_null() {
            self.nodes.insert(id, hwnd);
        }
    }

    pub fn set_text(&self, id: usize, text: &str) {
        if let Some(&hwnd) = self.nodes.get(&id) {
            let wide: Vec<u16> = OsStr::new(text).encode_wide().chain(Some(0)).collect();
            unsafe {
                let _ = SetWindowTextW(hwnd, windows::core::PCWSTR(wide.as_ptr()));
            }
        }
    }

    pub fn get_hwnd(&self, id: usize) -> Option<HWND> {
        self.nodes.get(&id).copied()
    }
}
