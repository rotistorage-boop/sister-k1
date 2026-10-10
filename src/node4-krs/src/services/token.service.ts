/**
 * Token-based Mutual Exclusion untuk worker orchestrator Node 4.
 *
 * Hanya worker yang memegang TOKEN yang boleh mengeksekusi critical
 * section penulisan kuota ke Node 3. Token berpindah secara FIFO
 * (mirip token ring satu-node), sehingga request concorrent di Node 4
 * otomatis diserialisasi sebelum menyentuh distributed lock Node 3.
 */

type Waiter = {
  resolve: () => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
};

class TokenMutex {
  private holder: string | null = null;
  private queue: Waiter[] = [];

  get status() {
    return { holder: this.holder, queueLength: this.queue.length, locked: this.holder !== null };
  }

  async acquire(owner: string, waitTimeoutMs = 20_000): Promise<void> {
    if (this.holder === null) {
      this.holder = owner;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve: () => {
          this.holder = owner;
          resolve();
        },
        reject,
        timer: setTimeout(() => {
          const idx = this.queue.indexOf(waiter);
          if (idx >= 0) this.queue.splice(idx, 1);
          reject(new Error(`Timeout menunggu TOKEN orchestrator setelah ${waitTimeoutMs}ms (holder: ${this.holder})`));
        }, waitTimeoutMs),
      };
      (waiter.timer as any)?.unref?.();
      this.queue.push(waiter);
    });
  }

  release(owner: string) {
    if (this.holder !== owner) {
      throw new Error(`Token release ditolak: '${owner}' bukan pemegang token (holder: ${this.holder})`);
    }
    const next = this.queue.shift();
    if (!next) {
      this.holder = null;
      return;
    }
    clearTimeout(next.timer);
    // holder dipindah di dalam resolve next agar tidak ada celah
    this.holder = null;
    next.resolve();
  }

  /** Eksekusi fn di dalam critical section token (acquire -> fn -> release). */
  async withToken<T>(owner: string, fn: () => Promise<T>, waitTimeoutMs = 20_000): Promise<T> {
    await this.acquire(owner, waitTimeoutMs);
    try {
      return await fn();
    } finally {
      try {
        this.release(owner);
      } catch {
        // abaikan double-release saat error path
      }
    }
  }
}

/** Singleton token mutex untuk proses Node 4. */
export const orchestratorToken = new TokenMutex();
