import {
  getKrsByIdService,
  getKrsByNimService,
  getAllKrsService,
  getKrsDetailByIdService,
  createKrsService,
} from "../services/krs.service.js";
import {
  callJsonRpc,
  JsonRpcError,
  JSON_RPC_ERRORS,
} from "../../../utils/jsonrpc.util.js";
import {
  createRmiProxy,
  RmiError,
} from "../../../utils/rmi.util.js";
import type { IScheduleRemoteService } from "../../../node5-schedule/src/interfaces/schedule-remote.interface.js";
import { SERVICE_URLS } from "../../../utils/service-url.util.js";
import { orchestratorToken } from "../services/token.service.js";
import {
  acquireQuotaLocksSorted,
  releaseQuotaLocks,
  decrementQuotaLocked,
  newClientId,
  quotaResource,
} from "../services/mutex-client.service.js";
import { getKrsPeriod, setKrsPeriod, checkPeriod } from "../services/krs-period.service.js";

// Helper function untuk melakukan Application-Level Aggregation (Enrichment via RPC to Node 3)
async function enrichKrsData(krsItem: any) {
  const details = await getKrsDetailByIdService(krsItem.id);
  const courseDetails = await Promise.all(
    details.map(async (d) => {
      try {
        const course = await callJsonRpc(
          SERVICE_URLS.course(),
          "getCourseById",
          { id: d.courseId },
          { timeoutMs: 3000 },
        );
        return course;
      } catch {
        return { id: d.courseId, nama: "Unknown Course" };
      }
    }),
  );
  return {
    ...krsItem,
    courses: courseDetails,
  };
}

export async function submitKrsHandler(params: {
  nim: string;
  courseIds: number[];
}) {
  const { nim, courseIds } = params || {};

  if (
    !nim ||
    !courseIds ||
    !Array.isArray(courseIds) ||
    courseIds.length === 0
  ) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "NIM and courseIds (non-empty array) are required",
    );
  }

  // 0. Validasi periode KRS memakai jam SERVER (time authority, adil untuk semua client)
  const nowServer = Date.now();
  const periodCheck = checkPeriod(nowServer);
  if (!periodCheck.isOpen) {
    throw new JsonRpcError(JSON_RPC_ERRORS.BAD_REQUEST.code, periodCheck.reason);
  }

  // 1. RPC Synchronous: Validasi Mahasiswa ke Node 2 (Student Server)
  let studentData: any = null;
  try {
    studentData = await callJsonRpc(
      SERVICE_URLS.student(),
      "checkStudentStatus",
      { nim },
      { timeoutMs: 5000 },
    );

    if (studentData.status !== "aktif") {
      throw new JsonRpcError(
        JSON_RPC_ERRORS.BAD_REQUEST.code,
        `Mahasiswa dengan NIM ${nim} tidak aktif (Status: ${studentData.status})`,
      );
    }
  } catch (err: any) {
    if (err instanceof JsonRpcError) throw err;
    throw new JsonRpcError(
      JSON_RPC_ERRORS.SERVICE_UNAVAILABLE.code,
      `Gagal menghubungi Node 2 (Student Server via RPC): ${err.message}`,
    );
  }

  // 2. Validasi awal kuota (read-only, fast-fail) + RMI jadwal boleh paralel.
  //    Pengurangan kuota yang sebenarnya dilakukan ATOMIK di critical section
  //    (langkah 4) sehingga tidak ada overbooking.
  const validCourses: any[] = [];
  for (const cid of courseIds) {
    try {
      const course = await callJsonRpc(
        SERVICE_URLS.course(),
        "checkQuota",
        { id: cid },
        { timeoutMs: 5000 },
      );

      if (course.kuota <= 0) {
        throw new JsonRpcError(
          JSON_RPC_ERRORS.BAD_REQUEST.code,
          `Kuota untuk Mata Kuliah ${course.nama} (ID: ${cid}) sudah habis`,
        );
      }
      validCourses.push(course);
    } catch (err: any) {
      if (err instanceof JsonRpcError) throw err;
      throw new JsonRpcError(
        JSON_RPC_ERRORS.SERVICE_UNAVAILABLE.code,
        `Gagal menghubungi Node 3 (Course Server via RPC): ${err.message}`,
      );
    }
  }

  // 3. RMI (Remote Method Invocation): Cek Konflik Jadwal ke Remote Object Node 5 (Schedule Server)
  let scheduleResult: any = null;
  try {
    // Membuat RMI Stub / Client Proxy untuk interface IScheduleRemoteService
    const scheduleRemote = createRmiProxy<IScheduleRemoteService>(
      SERVICE_URLS.scheduleRmi(),
      "ScheduleService",
      { timeoutMs: 5000 },
    );

    // Pemanggilan method langsung secara Object-Oriented melalui RMI Stub Proxy
    scheduleResult = await scheduleRemote.checkScheduleConflict(courseIds);

    if (scheduleResult.hasConflict) {
      throw new JsonRpcError(
        JSON_RPC_ERRORS.BAD_REQUEST.code,
        `Terdapat konflik jadwal: ${scheduleResult.conflicts.join("; ")}`,
      );
    }
  } catch (err: any) {
    if (err instanceof JsonRpcError) throw err;
    if (err instanceof RmiError) {
      throw new JsonRpcError(
        JSON_RPC_ERRORS.BAD_REQUEST.code,
        `RMI Error dari Node 5 (Schedule Service): ${err.message}`,
      );
    }
    throw new JsonRpcError(
      JSON_RPC_ERRORS.SERVICE_UNAVAILABLE.code,
      `Gagal menghubungi Node 5 (Schedule Server via RMI): ${err.message}`,
    );
  }

  // 4. CRITICAL SECTION: Token-based (Node 4) + Centralized lock (Node 3).
  //    Hanya pemegang token orchestrator yang boleh masuk; di dalamnya,
  //    acquire FIFO lock per mata kuliah (terurut anti-deadlock),
  //    decrement atomik, lalu release. Tanpa ini, dua request bersamaan
  //    bisa sama-sama membaca kuota=1 dan overbooking.
  const clientId = newClientId("node4");
  const tokenOwner = `${clientId}-submit`;
  let finalCourses: any[] = validCourses;
  let lockInfo: { resources: string[]; queued: boolean[] } = { resources: [], queued: [] };
  try {
    const res = await orchestratorToken.withToken(tokenOwner, async () => {
      const locks = await acquireQuotaLocksSorted(courseIds.map(Number), clientId);
      try {
        const decremented: any[] = [];
        for (const lock of locks) {
          const cid = Number(lock.resource.split(":")[1]);
          decremented.push(await decrementQuotaLocked(cid, lock, 1));
        }
        return { locks, decremented };
      } catch (err) {
        await releaseQuotaLocks(locks);
        throw err;
      }
    });
    lockInfo = {
      resources: courseIds.map((c) => quotaResource(Number(c))),
      queued: [],
    };
    finalCourses = res.decremented;
    // Simpan KRS dulu, baru lepaskan distributed lock agar tidak ada
    // celah request lain menyerobot sebelum baris KRS tercatat.
    const newKrs = await createKrsService(nim, courseIds.map(Number));
    await releaseQuotaLocks(res.locks);
    return {
      krs: newKrs,
      student: studentData,
      courses: finalCourses,
      scheduleCheck: scheduleResult,
      status: "KRS berhasil disimpan",
      sync: {
        mutualExclusion: "token(node4)+centralized-lock(node3)",
        clientId,
        lockResources: lockInfo.resources,
      },
    };
  } catch (err: any) {
    if (err instanceof JsonRpcError) throw err;
    throw new JsonRpcError(
      JSON_RPC_ERRORS.SERVICE_UNAVAILABLE.code,
      `Gagal mengamankan kuota (mutual exclusion): ${err.message}`,
    );
  }
}

export async function getAllKrsHandler(_params?: any) {
  const allKrs = await getAllKrsService();
  return await Promise.all(allKrs.map((item) => enrichKrsData(item)));
}

export async function getKrsByIdHandler(params: { id: number | string }) {
  const id = Number(params?.id);
  if (isNaN(id)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Valid KRS ID is required",
    );
  }

  const krsData = await getKrsByIdService(id);
  if (!krsData) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `KRS with ID ${id} not found`,
    );
  }

  return await enrichKrsData(krsData);
}

export async function getKrsByNimHandler(params: { nim: string }) {
  const { nim } = params || {};
  if (!nim) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "NIM is required",
    );
  }

  const list = await getKrsByNimService(nim);
  return await Promise.all(list.map((item) => enrichKrsData(item)));
}

// ---------------------------------------------------------------------------
// Physical Clock Synchronization - Cristian's Algorithm (time authority)
// ---------------------------------------------------------------------------

/** Endpoint acuan waktu: client mencatat T1/T4 di sekitar pemanggilan ini. */
export async function getTimeHandler(_params?: any) {
  const serverTime = Date.now();
  return { serverTime, iso: new Date(serverTime).toISOString() };
}

export async function getKrsPeriodHandler(_params?: any) {
  const period = getKrsPeriod();
  const now = Date.now();
  const check = checkPeriod(now);
  return {
    ...period,
    openAtIso: period.openAt !== null ? new Date(period.openAt).toISOString() : null,
    closeAtIso: period.closeAt !== null ? new Date(period.closeAt).toISOString() : null,
    serverTime: now,
    serverIso: new Date(now).toISOString(),
    isOpen: check.isOpen,
    reason: check.reason,
  };
}

export async function setKrsPeriodHandler(params: { openAt?: string | number | null; closeAt?: string | number | null; note?: string }) {
  const parse = (v: string | number | null | undefined): number | null => {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "number") return v;
    const t = Date.parse(v);
    if (!isNaN(t)) return t;
    const n = Number(v);
    if (!isNaN(n)) return n;
    throw new JsonRpcError(JSON_RPC_ERRORS.INVALID_PARAMS.code, `Format waktu tidak valid: ${v} (gunakan ISO 8601 atau epoch ms)`);
  };
  try {
    const period = setKrsPeriod(parse(params?.openAt), parse(params?.closeAt), params?.note);
    return { ...period, serverTime: Date.now() };
  } catch (err: any) {
    if (err instanceof JsonRpcError) throw err;
    throw new JsonRpcError(JSON_RPC_ERRORS.BAD_REQUEST.code, err.message);
  }
}

export async function getTokenStatusHandler(_params?: any) {
  return { ...orchestratorToken.status, mechanism: "token-based mutual exclusion (FIFO)" };
}
