import {
  getAllCourseService,
  getCourseByKodeService,
  getCourseByIdService,
  createCourseService,
  decrementQuotaAtomicService,
  setQuotaService,
} from "../services/course.service.js";
import {
  acquireLock,
  releaseLock,
  getLockStatus,
  assertLockOwnership,
  forceResetLock,
} from "../services/lock.service.js";
import { JsonRpcError, JSON_RPC_ERRORS } from "../../../utils/jsonrpc.util.js";

/** Nama resource lock untuk satu mata kuliah. */
export function quotaResource(id: number | string) {
  return `course:${Number(id)}:quota`;
}

export async function createCourseHandler(params: {
  kode: string;
  nama: string;
  sks: number | string;
  kuota: number | string;
}) {
  const { kode, nama } = params || {};
  const sks = Number(params?.sks);
  const kuota = Number(params?.kuota);

  if (!kode || typeof kode !== "string" || !kode.trim()) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kode mata kuliah is required and must be a non-empty string",
    );
  }

  if (!nama || typeof nama !== "string" || !nama.trim()) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Nama mata kuliah is required and must be a non-empty string",
    );
  }

  if (isNaN(sks) || sks <= 0) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "SKS must be a valid positive integer",
    );
  }

  if (isNaN(kuota) || kuota < 0) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kuota must be a valid non-negative integer",
    );
  }

  const cleanKode = kode.trim().toUpperCase();
  const cleanNama = nama.trim();

  const existing = await getCourseByKodeService(cleanKode);
  if (existing) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.BAD_REQUEST.code,
      `Mata kuliah dengan kode ${cleanKode} sudah ada`,
    );
  }

  return await createCourseService(cleanKode, cleanNama, Math.floor(sks), Math.floor(kuota));
}


export async function getAllCoursesHandler(_params?: any) {
  return await getAllCourseService();
}

export async function getCourseByKodeHandler(params: { kode: string }) {
  const { kode } = params || {};
  if (!kode) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kode mata kuliah is required",
    );
  }

  const course = await getCourseByKodeService(kode);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan kode ${kode} tidak ditemukan`,
    );
  }

  return course;
}

export async function getCourseByIdHandler(params: { id: number | string }) {
  const id = Number(params?.id);
  if (isNaN(id)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Valid course ID is required",
    );
  }

  const course = await getCourseByIdService(id);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan ID ${id} tidak ditemukan`,
    );
  }

  return course;
}

export async function checkQuotaHandler(params: { id: number | string }) {
  const id = Number(params?.id);
  if (isNaN(id)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Valid course ID is required",
    );
  }

  const course = await getCourseByIdService(id);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan ID ${id} tidak ditemukan`,
    );
  }

  return {
    id: course.id,
    kode: course.kode,
    nama: course.nama,
    sks: course.sks,
    kuota: course.kuota,
    isAvailable: course.kuota > 0,
    lock: getLockStatus(quotaResource(id)),
  };
}

// ---------------------------------------------------------------------------
// Distributed Mutual Exclusion (Centralized Lock Coordinator)
// ---------------------------------------------------------------------------

export async function acquireLockHandler(params: {
  resource?: string;
  courseId?: number | string;
  clientId: string;
  ttlMs?: number | string;
  waitTimeoutMs?: number | string;
}) {
  const clientId = params?.clientId?.trim();
  if (!clientId) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "clientId is required");
  }
  const resource = params?.resource?.trim() || (params?.courseId !== undefined ? quotaResource(params.courseId) : "");
  if (!resource) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "resource (atau courseId) is required, contoh: { courseId: 1, clientId: 'node4-...' }",
    );
  }
  const ttlMs = params?.ttlMs !== undefined ? Number(params.ttlMs) : 10_000;
  const waitTimeoutMs = params?.waitTimeoutMs !== undefined ? Number(params.waitTimeoutMs) : 15_000;
  try {
    return await acquireLock(resource, clientId, { ttlMs, waitTimeoutMs });
  } catch (err: any) {
    throw new JsonRpcError(JSON_RPC_ERRORS.SERVICE_UNAVAILABLE.code, err.message);
  }
}

export async function releaseLockHandler(params: { resource?: string; courseId?: number | string; clientId: string; token: string }) {
  const clientId = params?.clientId?.trim();
  const token = params?.token;
  if (!clientId || !token) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "clientId dan token lock is required");
  }
  const resource = params?.resource?.trim() || (params?.courseId !== undefined ? quotaResource(params.courseId) : "");
  if (!resource) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "resource (atau courseId) is required");
  }
  try {
    return { resource, ...releaseLock(resource, clientId, token) };
  } catch (err: any) {
    throw new JsonRpcError(JSON_RPC_ERRORS.BAD_REQUEST.code, err.message);
  }
}

export async function getLockStatusHandler(params: { resource?: string; courseId?: number | string }) {
  const resource = params?.resource?.trim() || (params?.courseId !== undefined ? quotaResource(params.courseId) : "");
  if (!resource) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "resource (atau courseId) is required");
  }
  return getLockStatus(resource);
}

/**
 * Critical section: kurangi kuota secara atomik.
 * WAJIB menyertakan lock token yang valid (hasil acquireLock) -> mutual exclusion.
 */
export async function decrementQuotaHandler(params: {
  id: number | string;
  amount?: number | string;
  clientId: string;
  lockToken: string;
}) {
  const id = Number(params?.id);
  const amount = params?.amount !== undefined ? Math.floor(Number(params.amount)) : 1;
  if (isNaN(id)) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "Valid course ID is required");
  }
  if (isNaN(amount) || amount <= 0) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "amount harus bilangan positif");
  }
  if (!params?.clientId || !params?.lockToken) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "clientId dan lockToken is required (acquireLock dulu sebelum decrementQuota)",
    );
  }
  try {
    assertLockOwnership(quotaResource(id), params.clientId, params.lockToken);
  } catch (err: any) {
    throw new JsonRpcError(JSON_RPC_ERRORS.BAD_REQUEST.code, err.message);
  }
  const updated = await decrementQuotaAtomicService(id, amount);
  if (!updated) {
    const course = await getCourseByIdService(id);
    if (!course) {
      throw new JsonRpcError(JSON_RPC_ERRORS.NOT_FOUND.code, `Mata kuliah dengan ID ${id} tidak ditemukan`);
    }
    throw new JsonRpcError(
      JSON_RPC_ERRORS.BAD_REQUEST.code,
      `Kuota untuk Mata Kuliah ${course.nama} (ID: ${id}) sudah habis (sisa: ${course.kuota})`,
    );
  }
  return {
    id: updated.id,
    kode: updated.kode,
    nama: updated.nama,
    sks: updated.sks,
    kuota: updated.kuota,
    decrementedBy: amount,
    isAvailable: updated.kuota > 0,
  };
}

/** Admin/testing: set ulang kuota (dipakai untuk simulasi rebutan kuota). */
export async function setQuotaHandler(params: { id: number | string; kuota: number | string }) {
  const id = Number(params?.id);
  const kuota = Math.floor(Number(params?.kuota));
  if (isNaN(id) || isNaN(kuota) || kuota < 0) {
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, "id valid dan kuota >= 0 is required");
  }
  const updated = await setQuotaService(id, kuota);
  if (!updated) {
    throw new JsonRpcError(JSON_RPC_ERRORS.NOT_FOUND.code, `Mata kuliah dengan ID ${id} tidak ditemukan`);
  }
  return updated;
}

export async function resetLockHandler(params?: { resource?: string }) {
  return forceResetLock(params?.resource?.trim() || undefined);
}
