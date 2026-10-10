/**
 * Centralized Mutual Exclusion - Lock Coordinator (Node 3 / Course Server).
 *
 * Node 3 bertindak sebagai koordinator lock terpusat untuk resource kuota
 * mata kuliah. Setiap transaksi yang ingin menulis kuota (decrement)
 * WAJIB: acquire lock -> critical section -> release lock.
 *
 * Mekanisme: FIFO queue per resource + TTL (anti-deadlock jika holder crash).
 */

export interface AcquireLockResult {
  resource: string;
  clientId: string;
  token: string;
  /** true jika langsung dapat tanpa antre, false jika sempat menunggu dalam queue */
  queued: boolean;
  queueLength: number;
}

interface QueueEntry {
  clientId: string;
  resolve: (v: AcquireLockResult) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
  queued: boolean;
}

interface LockState {
  owner: string | null;
  token: string | null;
  expiresAt: number;
  expireTimer: NodeJS.Timeout | null;
  queue: QueueEntry[];
}

const locks = new Map<string, LockState>();

function getOrCreate(resource: string): LockState {
  let s = locks.get(resource);
  if (!s) {
    s = { owner: null, token: null, expiresAt: 0, expireTimer: null, queue: [] };
    locks.set(resource, s);
  }
  return s;
}

function clearExpireTimer(s: LockState) {
  if (s.expireTimer) {
    clearTimeout(s.expireTimer);
    s.expireTimer = null;
  }
}

/** Melepaskan paksa saat TTL habis, lalu memberikan ke penunggu berikutnya (FIFO). */
function forceExpire(resource: string) {
  const s = locks.get(resource);
  if (!s || !s.owner) return;
  s.owner = null;
  s.token = null;
  s.expiresAt = 0;
  grantNext(resource);
}

/** Memberikan lock ke antrean berikutnya jika lock sedang bebas. */
function grantNext(resource: string) {
  const s = locks.get(resource);
  if (!s || s.owner) return;
  const next = s.queue.shift();
  if (!next) return;
  const token = `${resource}:${next.clientId}:${Date.now()}:${Math.floor(Math.random() * 1e9)}`;
  s.owner = next.clientId;
  s.token = token;
  s.expiresAt = Date.now() + (next as any).ttlMs;
  clearTimeout(next.timer);
  clearExpireTimer(s);
  s.expireTimer = setTimeout(() => forceExpire(resource), (next as any).ttlMs);
  // Lindungi dari unref error di lingkungan non-node (aman di node)
  (s.expireTimer as any)?.unref?.();
  next.resolve({
    resource,
    clientId: next.clientId,
    token,
    queued: next.queued,
    queueLength: s.queue.length,
  });
}

export function acquireLock(
  resource: string,
  clientId: string,
  opts: { ttlMs?: number; waitTimeoutMs?: number } = {},
): Promise<AcquireLockResult> {
  const ttlMs = opts.ttlMs ?? 10_000;
  const waitTimeoutMs = opts.waitTimeoutMs ?? 15_000;
  const s = getOrCreate(resource);

  // Kasus bebas / sudah kedaluwarsa -> langsung grant
  if (!s.owner || Date.now() > s.expiresAt) {
    clearExpireTimer(s);
    // buang owner basi
    s.owner = null;
    s.token = null;
    const token = `${resource}:${clientId}:${Date.now()}:${Math.floor(Math.random() * 1e9)}`;
    s.owner = clientId;
    s.token = token;
    s.expiresAt = Date.now() + ttlMs;
    s.expireTimer = setTimeout(() => forceExpire(resource), ttlMs);
    (s.expireTimer as any)?.unref?.();
    return Promise.resolve({
      resource,
      clientId,
      token,
      queued: false,
      queueLength: s.queue.length,
    });
  }

  // Re-entrant: client yang sama sudah memegang lock -> perpanjang TTL, kembalikan token sama
  if (s.owner === clientId && s.token) {
    s.expiresAt = Date.now() + ttlMs;
    clearExpireTimer(s);
    s.expireTimer = setTimeout(() => forceExpire(resource), ttlMs);
    (s.expireTimer as any)?.unref?.();
    return Promise.resolve({
      resource,
      clientId,
      token: s.token,
      queued: false,
      queueLength: s.queue.length,
    });
  }

  // Sibuk -> masuk antrean FIFO
  return new Promise<AcquireLockResult>((resolve, reject) => {
    const entry: QueueEntry = {
      clientId,
      resolve,
      reject,
      queued: true,
      timer: setTimeout(() => {
        // timeout menunggu -> keluarkan dari queue
        const idx = s.queue.indexOf(entry);
        if (idx >= 0) s.queue.splice(idx, 1);
        reject(new Error(`Timeout menunggu lock '${resource}' setelah ${waitTimeoutMs}ms (posisi antrean)`));
      }, waitTimeoutMs),
    };
    (entry as any).ttlMs = ttlMs;
    // cegah timer menahan proses
    (entry.timer as any)?.unref?.();
    s.queue.push(entry);
  });
}

export function releaseLock(resource: string, clientId: string, token: string): { released: boolean; queueLength: number } {
  const s = locks.get(resource);
  if (!s || !s.owner) {
    throw new Error(`Lock '${resource}' sedang tidak dipegang siapa pun`);
  }
  if (s.owner !== clientId || s.token !== token) {
    throw new Error(`releaseLock ditolak: '${clientId}' bukan pemilik lock '${resource}'`);
  }
  clearExpireTimer(s);
  s.owner = null;
  s.token = null;
  s.expiresAt = 0;
  grantNext(resource);
  return { released: true, queueLength: s.queue.length };
}

export function getLockStatus(resource: string) {
  const s = locks.get(resource);
  if (!s) return { resource, locked: false, owner: null, queueLength: 0, expiresInMs: 0 };
  const locked = !!s.owner && Date.now() <= s.expiresAt;
  return {
    resource,
    locked,
    owner: locked ? s.owner : null,
    queueLength: s.queue.length,
    expiresInMs: locked ? Math.max(0, s.expiresAt - Date.now()) : 0,
  };
}

/** Verifikasi kepemilikan lock sebelum operasi tulis kuota. */
export function assertLockOwnership(resource: string, clientId: string, token: string) {
  const s = locks.get(resource);
  if (!s || s.owner !== clientId || s.token !== token || Date.now() > s.expiresAt) {
    throw new Error(
      `Akses kritis ditolak: client '${clientId}' tidak memegang lock '${resource}'. Panggil acquireLock dulu.`,
    );
  }
}

/** Reset paksa (untuk testing / admin). */
export function forceResetLock(resource?: string) {
  if (resource) {
    const s = locks.get(resource);
    if (s) {
      clearExpireTimer(s);
      for (const q of s.queue) {
        clearTimeout(q.timer);
        q.reject(new Error(`Lock '${resource}' di-reset paksa`));
      }
      locks.delete(resource);
    }
    return { reset: resource };
  }
  for (const [, s] of locks) {
    clearExpireTimer(s);
    for (const q of s.queue) {
      clearTimeout(q.timer);
      q.reject(new Error("Semua lock di-reset paksa"));
    }
  }
  locks.clear();
  return { reset: "all" };
}
