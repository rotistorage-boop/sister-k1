import { Context } from "hono";
import { errorResponse, successResponse } from "../../../utils/response.util";
import {
  getAllCourseService,
  getCourseByKodeService,
  getCourseByIdService,
} from "../services/course.service";

export async function getCourseByKodeHandler(c: Context) {
  try {
    const kode = c.req.param("kode");
    if (!kode) {
      return errorResponse(c, "Kode is required", 400);
    }

    const course = await getCourseByKodeService(kode);
    if (!course) {
      return errorResponse(c, "Kode not found", 404);
    }

    return successResponse(c, course, "Course retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve course", 500, err);
  }
}

export async function getCourseByIdHandler(c: Context) {
  try {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return errorResponse(c, "Invalid Course ID", 400);
    }

    const course = await getCourseByIdService(id);
    if (!course) {
      return errorResponse(c, "Course not found", 404);
    }

    return successResponse(c, course, "Course retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve course", 500, err);
  }
}

export async function getAllCourseHandler(c: Context) {
  try {
    const allCourse = await getAllCourseService();
    return successResponse(c, allCourse, "All course retrieved successfully");
  } catch (err) {
    return errorResponse(c, "Failed to retrieve all course", 500, err);
  }
}
