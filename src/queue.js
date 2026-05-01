export class AsyncQueue {
  constructor(handler) {
    this.handler = handler;
    this.items = [];
    this.running = false;
  }

  push(item) {
    this.items.push(item);
    void this.run();
  }

  size() {
    return this.items.length + (this.running ? 1 : 0);
  }

  async run() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      while (this.items.length > 0) {
        const item = this.items.shift();

        try {
          await this.handler(item);
        } catch (error) {
          console.error('[queue] Failed to process item:', error.message);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
