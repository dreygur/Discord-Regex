import { QueueTask } from "./types";

class FetchQueue {
  private queue: QueueTask[];
  private processing: boolean;

  constructor() {
    this.queue = [];
    this.processing = false;
  }

  public add(
    url: URL,
    init: RequestInit = {},
    retries: number = 3,
    delay: number = 1000
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        url,
        init,
        retriesLeft: retries,
        delay,
        resolve,
        reject,
      });
      if (!this.processing) this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const task = this.queue.shift()!;

    try {
      const response = await fetch(task.url, task.init);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      task.resolve(response);
    } catch (error) {
      if (task.retriesLeft > 0) {
        task.retriesLeft--;
        setTimeout(() => {
          this.queue.unshift(task);
          this.processQueue();
        }, task.delay);
      } else {
        task.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
    await this.processQueue();
  }
}

export { FetchQueue };