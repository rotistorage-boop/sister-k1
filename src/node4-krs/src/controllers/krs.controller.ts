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

  // 2. RPC Synchronous: Validasi Kuota Course ke Node 3 (Course Server)
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

  // 4. Simpan KRS ke DB lokal Node 4
  const newKrs = await createKrsService(nim, courseIds);

  return {
    krs: newKrs,
    student: studentData,
    courses: validCourses,
    scheduleCheck: scheduleResult,
    status: "KRS berhasil disimpan",
  };
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
