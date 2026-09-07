export interface Scheduler {
  schedule(task: () => void): void;
}
