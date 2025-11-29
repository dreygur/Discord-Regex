import { QueueTask } from "./types";

// Default values
const DEFAULT_RETRIES = parseInt(process.env.DEFAULT_RETRIES as string) || 3;
const DEFAULT_DELAY = parseInt(process.env.DEFAULT_DELAY as string) || 1000;

class FetchQueue {
  private activeTasks: Set<Promise<void>>;

  constructor() {
    this.activeTasks = new Set();
  }

  public add(
    url: URL,
    init: RequestInit = {},
    retries: number = DEFAULT_RETRIES,
    delay: number = DEFAULT_DELAY
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = {
        url,
        init,
        retriesLeft: retries,
        delay,
        resolve,
        reject,
      };
      
      // Process task immediately in parallel
      const taskPromise = this.processTask(task);
      this.activeTasks.add(taskPromise);
      taskPromise.finally(() => {
        this.activeTasks.delete(taskPromise);
      });
    });
  }

  private async processTask(task: QueueTask): Promise<void> {
    const maxRetries = task.retriesLeft;
    const initialDelay = task.delay;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(task.url, task.init);
        
        if (response.ok) {
          task.resolve(response);
          return;
        }
        
        // Handle HTTP 429 with Retry-After header
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response);
          if (retryAfter && attempt < maxRetries) {
            await this.sleep(retryAfter);
            continue;
          }
        }
        
        // If not ok and not last attempt, retry with exponential backoff
        if (attempt < maxRetries) {
          const backoffDelay = initialDelay * Math.pow(2, attempt);
          await this.sleep(backoffDelay);
          continue;
        }
        
        // Last attempt failed
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        // If this was the last attempt, reject
        if (attempt >= maxRetries) {
          task.reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        
        // Otherwise, retry with exponential backoff
        const backoffDelay = initialDelay * Math.pow(2, attempt);
        await this.sleep(backoffDelay);
      }
    }
  }

  private parseRetryAfter(response: Response): number | null {
    const retryAfter = response.headers.get('Retry-After');
    if (!retryAfter) return null;
    
    // Try parsing as seconds (integer)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to milliseconds
    }
    
    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
    
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// The fetch Queue
const queue = new FetchQueue();

export { FetchQueue, queue };