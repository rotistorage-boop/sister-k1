import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const krsStatusEnum = ["pending", "approved", "rejected"] as const;

export const krs = sqliteTable("krs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nim: text("nim").notNull(),
  status: text("status", { enum: krsStatusEnum }).default("pending").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const krsDetails = sqliteTable("krs_detail", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  krsId: integer("krs_id")
    .notNull()
    .references(() => krs.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull(),
});

export type Krs = typeof krs.$inferSelect;
export type NewKrs = typeof krs.$inferInsert;
export type KrsDetail = typeof krsDetails.$inferSelect;
export type NewKrsDetail = typeof krsDetails.$inferInsert;
