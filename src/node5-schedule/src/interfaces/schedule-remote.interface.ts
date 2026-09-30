import type { IRemote } from "../../../utils/rmi.util.js";
import type { Schedule } from "../db/schema.js";

export interface ScheduleConflictResult {
  hasConflict: boolean;
  conflicts: string[];
  schedules: Schedule[];
}

/**
 * Remote Interface untuk Node 5 (Schedule Service)
 * Mendefinisikan method-method yang dapat di-invoke secara remote melalui RMI.
 */
export interface IScheduleRemoteService extends IRemote {
  getAllSchedules(): Promise<Schedule[]>;
  getScheduleByCourseId(courseId: number): Promise<Schedule[]>;
  getScheduleByDay(day: string): Promise<Schedule[]>;
  checkScheduleConflict(courseIds: number[]): Promise<ScheduleConflictResult>;
}
