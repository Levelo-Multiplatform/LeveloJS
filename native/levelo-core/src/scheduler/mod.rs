//! A small scheduler foundation for the native runtime.
//!
//! The scheduler intentionally knows nothing about signals or platform UI yet.
//! Its job is simply to hold work in a predictable order. Reactive scheduling
//! can be layered onto this without coupling it to a particular platform.

use std::collections::VecDeque;

#[derive(Debug)]
pub struct Scheduler<T> {
    queue: VecDeque<T>,
    scheduled: bool,
}

impl<T> Default for Scheduler<T> {
    fn default() -> Self {
        Self {
            queue: VecDeque::new(),
            scheduled: false,
        }
    }
}

impl<T> Scheduler<T> {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn schedule(&mut self, work: T) {
        self.queue.push_back(work);
        self.scheduled = true;
    }

    pub fn pop(&mut self) -> Option<T> {
        let work = self.queue.pop_front();

        if self.queue.is_empty() {
            self.scheduled = false;
        }

        work
    }

    pub fn is_scheduled(&self) -> bool {
        self.scheduled
    }

    pub fn len(&self) -> usize {
        self.queue.len()
    }

    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    pub fn clear(&mut self) {
        self.queue.clear();
        self.scheduled = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn processes_work_in_order() {
        let mut scheduler = Scheduler::new();

        scheduler.schedule(1);
        scheduler.schedule(2);

        assert_eq!(scheduler.pop(), Some(1));
        assert_eq!(scheduler.pop(), Some(2));
        assert!(!scheduler.is_scheduled());
    }
}
