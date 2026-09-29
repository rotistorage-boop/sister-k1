import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { schedules, dayEnum, type Schedule } from "../db/schema";

export async function getScheduleByCourseIdService(
  courseId: number,
): Promise<Schedule[]> {
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.courseId, courseId))
    .all();
}

export async function getAllSchedulesService(): Promise<Schedule[]> {
  return db.select().from(schedules).all();
}

export async function getScheduleByDayService(
  day: (typeof dayEnum)[number] | string,
): Promise<Schedule[]> {
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.day, day as (typeof dayEnum)[number]))
    .all();
}

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

function hasTimeOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.day !== b.day) {
    return false;
  }
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export async function checkScheduleConflictService(
  courseIds: number[],
): Promise<{ hasConflict: boolean; conflicts: string[] }> {
  const allSchedules: Schedule[] = [];

  for (const courseId of courseIds) {
    const courseSchedules = await getScheduleByCourseIdService(courseId);
    allSchedules.push(...courseSchedules);
  }

  const conflicts: string[] = [];

  for (let i = 0; i < allSchedules.length; i++) {
    for (let j = i + 1; j < allSchedules.length; j++) {
      const a = allSchedules[i];
      const b = allSchedules[j];

      if (a.courseId === b.courseId) {
        continue;
      }

      if (hasTimeOverlap(a, b)) {
        conflicts.push(
          `Jadwal courseId ${a.courseId} (${a.day} ${a.startTime}-${a.endTime}) ` +
            `bentrok dengan courseId ${b.courseId} (${b.day} ${b.startTime}-${b.endTime})`,
        );
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
