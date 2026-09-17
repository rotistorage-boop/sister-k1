import { Context } from "hono";
import {
  getStudentByNimService,
  getAllStudentsService,
  createStudentService,
} from "../services/student.service.js";
import {
  successResponse,
  errorResponse,
} from "../../../utils/response.util.js";

export async function createStudentHandler(c: Context) {
  try {
    const body = await c.req.json();
    const { nim, nama, status } = body;

    if (!nim || !nama) {
      return errorResponse(c, "NIM and nama are required", 400);
    }

    const existing = await getStudentByNimService(nim);
    if (existing) {
      return errorResponse(c, `Mahasiswa dengan NIM ${nim} sudah ada`, 400);
    }

    const newStudent = await createStudentService(nim, nama, status || "aktif");
    return successResponse(c, newStudent, "Mahasiswa berhasil ditambahkan", 201);
  } catch (err: any) {
    return errorResponse(c, "Failed to create student", 500, err);
  }
}

export async function getStudentByNimHandler(c: Context) {
  try {
    const nim = c.req.param("nim");
    if (!nim) {
      return errorResponse(c, "NIM is required", 400);
    }

    const student = await getStudentByNimService(nim);
    if (!student) {
      return errorResponse(c, "Student not found", 404);
    }

    return successResponse(c, student, "Student retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve student", 500, err);
  }
}

export async function getStudentStatusHandler(c: Context) {
  try {
    const nim = c.req.param("nim");
    if (!nim) {
      return errorResponse(c, "NIM is required", 400);
    }

    const student = await getStudentByNimService(nim);
    if (!student) {
      return errorResponse(c, "Student not found", 404);
    }

    return successResponse(
      c,
      { nim: student.nim, status: student.status },
      "Student status retrieved successfully"
    );
  } catch (err) {
    return errorResponse(c, "Failed to retrieve student status", 500, err);
  }
}

export async function getAllStudentsHandler(c: Context) {
  try {
    const allStudents = await getAllStudentsService();
    return successResponse(
      c,
      allStudents,
      "All students retrieved successfully",
    );
  } catch (err) {
    return errorResponse(c, "Failed to retrieve students", 500, err);
  }
}
