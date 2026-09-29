import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const dayEnum = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
] as const;

export const schedules = sqliteTable("schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  day: text("day", { enum: dayEnum }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room").notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
