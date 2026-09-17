import { Context } from "hono";
import {
  getKrsByIdService,
  getKrsByNimService,
  getAllKrsService,
  getKrsDetailByIdService,
  createKrsService,
} from "../services/krs.service";
import { successResponse, errorResponse } from "../../../utils/response.util";

const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL;
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;

// Helper function untuk melakukan Application-Level Aggregation (Enrichment via RPC to Node 3)
async function enrichKrsData(krsItem: any) {
  const details = await getKrsDetailByIdService(krsItem.id);
  const courseDetails = await Promise.all(
    details.map(async (d) => {
      try {
        const res = await fetch(`${COURSE_SERVICE_URL}/id/${d.courseId}`);
        if (res.ok) {
          const body = await res.json();
          return body.data;
        }
      } catch { }
      return { id: d.courseId, nama: "Unknown Course" };
    })
  );
  return {
    ...krsItem,
    courses: courseDetails,
  };
}

export async function submitKrsHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { nim, courseIds } = body;

    if (!nim || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return errorResponse(c, "NIM and courseIds (non-empty array) are required", 400);
    }

    // 1. RPC: Validasi Mahasiswa ke Node 2 (Student Server)
    let studentData: any = null;
    try {
      const studentRes = await fetch(`${STUDENT_SERVICE_URL}/${nim}/status`);
      if (!studentRes.ok) {
        return errorResponse(c, `Mahasiswa dengan NIM ${nim} tidak ditemukan di Node 2`, 404);
      }
      const studentBody = await studentRes.json();
      studentData = studentBody.data;

      if (studentData.status !== "aktif") {
        return errorResponse(c, `Mahasiswa dengan NIM ${nim} tidak aktif (Status: ${studentData.status})`, 400);
      }
    } catch (err: any) {
      return errorResponse(c, `Gagal menghubungi Node 2 (Student Service): ${err.message}`, 503);
    }

    // 2. RPC: Validasi Course ke Node 3 (Course Server)
    const validCourses: any[] = [];
    for (const cid of courseIds) {
      try {
        const courseRes = await fetch(`${COURSE_SERVICE_URL}/id/${cid}`);
        if (!courseRes.ok) {
          return errorResponse(c, `Mata Kuliah ID ${cid} tidak ditemukan di Node 3`, 404);
        }
        const courseBody = await courseRes.json();
        const course = courseBody.data;
        if (course.kuota <= 0) {
          return errorResponse(c, `Kuota untuk Mata Kuliah ${course.nama} (ID: ${cid}) sudah habis`, 400);
        }
        validCourses.push(course);
      } catch (err: any) {
        return errorResponse(c, `Gagal menghubungi Node 3 (Course Service): ${err.message}`, 503);
      }
    }

    // 3. Simpan KRS ke DB lokal Node 4
    const newKrs = await createKrsService(nim, courseIds);

    // 4. AMI (Asynchronous Method Invocation): Kirim notifikasi ke Node 5 tanpa await (non-blocking)
    fetch(`${NOTIFICATION_SERVICE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nim,
        message: `KRS berhasil diajukan untuk ${validCourses.map((c) => c.nama).join(", ")}`,
      }),
    }).catch((err) => {
      console.error("[AMI Notification Error] Gagal mengirim notifikasi ke Node 5:", err.message);
    });

    return successResponse(
      c,
      {
        krs: newKrs,
        student: studentData,
        courses: validCourses,
      },
      "KRS berhasil disimpan",
      201
    );
  } catch (err) {
    return errorResponse(c, "Gagal memproses submit KRS", 500, err);
  }
}

export async function getAllKrsHandler(c: Context) {
  try {
    const allKrs = await getAllKrsService();
    const enrichedList = await Promise.all(allKrs.map((item) => enrichKrsData(item)));
    return successResponse(c, enrichedList, "All KRS retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve KRS list", 500, err);
  }
}

export async function getKrsByIdHandler(c: Context) {
  try {
    const rawId = c.req.param("id");
    const id = Number(rawId);

    if (!rawId || isNaN(id)) {
      return errorResponse(c, "Valid KRS ID is required", 400);
    }

    const krsData = await getKrsByIdService(id);
    if (!krsData) {
      return errorResponse(c, "KRS not found", 404);
    }

    const enriched = await enrichKrsData(krsData);
    return successResponse(c, enriched, "KRS retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve KRS", 500, err);
  }
}

export async function getKrsByNimHandler(c: Context) {
  try {
    const nim = c.req.param("nim");
    if (!nim) {
      return errorResponse(c, "NIM is required", 400);
    }

    const list = await getKrsByNimService(nim);
    const enrichedList = await Promise.all(list.map((item) => enrichKrsData(item)));

    return successResponse(c, enrichedList, "KRS list by NIM retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve KRS list by NIM", 500, err);
  }
}


