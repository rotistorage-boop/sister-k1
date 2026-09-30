import { createRmiProxy } from "./client";

export interface Schedule {
  id: number;
  courseId: number;
  day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface ScheduleConflictResult {
  hasConflict: boolean;
  conflicts: string[];
  schedules: Schedule[];
}

/**
 * Interface Remote Schedule Service
 */
export interface IScheduleRemoteService {
  getAllSchedules(): Promise<Schedule[]>;
  getScheduleByCourseId(courseId: number): Promise<Schedule[]>;
  getScheduleByDay(day: string): Promise<Schedule[]>;
  checkScheduleConflict(courseIds: number[]): Promise<ScheduleConflictResult>;
}

const SCHEDULE_RMI_URL =
  import.meta.env.VITE_SCHEDULE_SERVICE_URL
    ? `${import.meta.env.VITE_SCHEDULE_SERVICE_URL}/rmi`
    : "/rmi/schedule";

// Inisialisasi Dynamic Client Stub / Proxy untuk ScheduleService
export const scheduleRemoteService = createRmiProxy<IScheduleRemoteService>(
  SCHEDULE_RMI_URL,
  "ScheduleService",
);

// Helper wrapper functions untuk pemanggilan yang nyaman
export async function getAllSchedules(): Promise<Schedule[]> {
  return scheduleRemoteService.getAllSchedules();
}

export async function getScheduleByCourseId(
  courseId: number,
): Promise<Schedule[]> {
  return scheduleRemoteService.getScheduleByCourseId(courseId);
}

export async function getScheduleByDay(day: string): Promise<Schedule[]> {
  return scheduleRemoteService.getScheduleByDay(day);
}

export async function checkScheduleConflict(
  courseIds: number[],
): Promise<ScheduleConflictResult> {
  return scheduleRemoteService.checkScheduleConflict(courseIds);
}
