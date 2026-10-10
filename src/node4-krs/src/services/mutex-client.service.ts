/**
 * Client helper untuk Distributed Mutual Exclusion ke Node 3.
 * Membungkus RPC acquireLock / releaseLock / decrementQuota.
 */
import { callJsonRpc } from "../../../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../../../utils/service-url.util.js";

export interface RemoteLock {
  resource: string;
  clientId: string;
  token: string;
  queued: boolean;
}

export function quotaResource(courseId: number | string) {
  return `course:${Number(courseId)}:quota`;
}

export function newClientId(prefix = "node4"): string {
  return `${prefix}-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export async function acquireQuotaLock(
  courseId: number | string,
  clientId: string,
  opts: { ttlMs?: number; waitTimeoutMs?: number; timeoutMs?: number } = {},
): Promise<RemoteLock> {
  return callJsonRpc(SERVICE_URLS.course(), "acquireLock", {
    resource: quotaResource(courseId),
    clientId,
    ttlMs: opts.ttlMs ?? 10_000,
    waitTimeoutMs: opts.waitTimeoutMs ?? 15_000,
  }, { timeoutMs: (opts.waitTimeoutMs ?? 15_000) + (opts.timeoutMs ?? 5_000) });
}

export async function releaseQuotaLock(lock: RemoteLock): Promise<void> {
  await callJsonRpc(SERVICE_URLS.course(), "releaseLock", {
    resource: lock.resource,
    clientId: lock.clientId,
    token: lock.token,
  }, { timeoutMs: 5000 });
}

export async function decrementQuotaLocked(
  courseId: number | string,
  lock: RemoteLock,
  amount = 1,
): Promise<any> {
  return callJsonRpc(SERVICE_URLS.course(), "decrementQuota", {
    id: Number(courseId),
    amount,
    clientId: lock.clientId,
    lockToken: lock.token,
  }, { timeoutMs: 8000 });
}

/**
 * Acquire banyak lock sekaligus dengan urutan resource terurut (sort ascending)
 * untuk mencegah deadlock antar transaksi yang meminta set course berbeda.
 */
export async function acquireQuotaLocksSorted(
  courseIds: number[],
  clientId: string,
  opts: { ttlMs?: number; waitTimeoutMs?: number } = {},
): Promise<RemoteLock[]> {
  const sorted = [...new Set(courseIds)].sort((a, b) => a - b);
  const held: RemoteLock[] = [];
  try {
    for (const cid of sorted) {
      held.push(await acquireQuotaLock(cid, clientId, opts));
    }
    return held;
  } catch (err) {
    // rollback: lepaskan yang sudah didapat (urutan terbalik)
    await releaseQuotaLocks(held);
    throw err;
  }
}

export async function releaseQuotaLocks(locks: RemoteLock[]): Promise<void> {
  for (let i = locks.length - 1; i >= 0; i--) {
    try {
      await releaseQuotaLock(locks[i]);
    } catch {
      // best-effort: lock akan kedaluwarsa via TTL
    }
  }
}
