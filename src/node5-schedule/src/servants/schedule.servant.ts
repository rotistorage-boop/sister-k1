import type {
  IScheduleRemoteService,
  ScheduleConflictResult,
} from "../interfaces/schedule-remote.interface.js";
import {
  getAllSchedulesService,
  getScheduleByCourseIdService,
  getScheduleByDayService,
  checkScheduleConflictService,
} from "../services/schedule.service.js";
import type { Schedule } from "../db/schema.js";
import { RmiError, RMI_ERRORS } from "../../../utils/rmi.util.js";

/**
 * ScheduleRemoteService (Remote Servant Object)
 * Objek instans di sisi server (Node 5) yang method-methodnya dieksekusi melalui RMI.
 */
export class ScheduleRemoteService implements IScheduleRemoteService {
  /**
   * Mengambil seluruh daftar jadwal kuliah
   */
  async getAllSchedules(): Promise<Schedule[]> {
    return await getAllSchedulesService();
  }

  /**
   * Mengambil jadwal berdasarkan ID mata kuliah
   */
  async getScheduleByCourseId(courseId: number): Promise<Schedule[]> {
    const id = Number(courseId);
    if (isNaN(id) || id <= 0) {
      throw new RmiError(
        RMI_ERRORS.INVALID_ARGUMENTS.code,
        "courseId must be a valid positive number",
      );
    }
    return await getScheduleByCourseIdService(id);
  }

  /**
   * Mengambil jadwal berdasarkan hari perkuliahan
   */
  async getScheduleByDay(day: string): Promise<Schedule[]> {
    if (!day || typeof day !== "string") {
      throw new RmiError(
        RMI_ERRORS.INVALID_ARGUMENTS.code,
        "day parameter is required and must be a string",
      );
    }
    return await getScheduleByDayService(day.trim());
  }

  /**
   * Mengecek bentrok jam kuliah antar daftar course ID
   */
  async checkScheduleConflict(
    courseIds: number[],
  ): Promise<ScheduleConflictResult> {
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      throw new RmiError(
        RMI_ERRORS.INVALID_ARGUMENTS.code,
        "courseIds must be a non-empty array of numbers",
      );
    }

    const sanitizedIds = courseIds.map((id) => Number(id)).filter((n) => !isNaN(n));
    if (sanitizedIds.length === 0) {
      throw new RmiError(
        RMI_ERRORS.INVALID_ARGUMENTS.code,
        "courseIds contains no valid numeric IDs",
      );
    }

    const conflictData = await checkScheduleConflictService(sanitizedIds);

    // Ambil detail seluruh jadwal dari mata kuliah terkait untuk response yang komprehensif
    const allSchedules: Schedule[] = [];
    for (const cid of sanitizedIds) {
      const s = await getScheduleByCourseIdService(cid);
      allSchedules.push(...s);
    }

    return {
      hasConflict: conflictData.hasConflict,
      conflicts: conflictData.conflicts,
      schedules: allSchedules,
    };
  }
}
