import { Context } from "hono";
import {
  getStudentByNimService,
  getAllStudentsService,
} from "../services/student.service.js";
import {
  successResponse,
  errorResponse,
} from "../../../utils/response.util.js";

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
