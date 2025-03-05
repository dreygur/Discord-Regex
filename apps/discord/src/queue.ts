import { QueueTask } from "./types";

// Default values
const DEFAULT_RETRIES = parseInt(process.env.DEFAULT_RETRIES as string) || 3;
const DEFAULT_DELAY = parseInt(process.env.DEFAULT_DELAY as string) || 1000;

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
    retries: number = DEFAULT_RETRIES,
    delay: number = DEFAULT_DELAY
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