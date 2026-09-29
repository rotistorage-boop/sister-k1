import { callRpc } from "./client";

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

const SCHEDULE_RPC_URL =
  import.meta.env.VITE_SCHEDULE_SERVICE_URL || "/rpc/schedule";

export async function getAllSchedules(): Promise<Schedule[]> {
  return callRpc<Schedule[]>(SCHEDULE_RPC_URL, "getAllSchedules");
}

export async function getScheduleByCourseId(
  courseId: number,
): Promise<Schedule[]> {
  return callRpc<Schedule[]>(SCHEDULE_RPC_URL, "getScheduleByCourseId", {
    courseId,
  });
}

export async function getScheduleByDay(day: string): Promise<Schedule[]> {
  return callRpc<Schedule[]>(SCHEDULE_RPC_URL, "getScheduleByDay", { day });
}

export async function checkScheduleConflict(
  courseIds: number[],
): Promise<ScheduleConflictResult> {
  return callRpc<ScheduleConflictResult>(
    SCHEDULE_RPC_URL,
    "checkScheduleConflict",
    {
      courseIds,
    },
  );
}
