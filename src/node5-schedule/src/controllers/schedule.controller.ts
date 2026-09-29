import {
  getScheduleByCourseIdService,
  getAllSchedulesService,
  getScheduleByDayService,
  checkScheduleConflictService,
} from "../services/schedule.service.js";
import {
  JsonRpcError,
  JSON_RPC_ERRORS,
} from "../../../utils/jsonrpc.util.js";

export async function getScheduleByCourseIdHandler(params: {
  courseId: number;
}) {
  const courseId = Number(params?.courseId);
  if (isNaN(courseId)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "courseId (number) is required",
    );
  }

  return await getScheduleByCourseIdService(courseId);
}

export async function getAllSchedulesHandler() {
  return await getAllSchedulesService();
}

export async function getScheduleByDayHandler(params: { day: string }) {
  const { day } = params || {};
  if (!day) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "day is required",
    );
  }

  return await getScheduleByDayService(day);
}

export async function checkScheduleConflictHandler(params: {
  courseIds: number[];
}) {
  const { courseIds } = params || {};
  if (!courseIds || !Array.isArray(courseIds) || courseIds.length < 2) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "courseIds (array with at least 2 items) is required",
    );
  }

  return await checkScheduleConflictService(courseIds);
}
