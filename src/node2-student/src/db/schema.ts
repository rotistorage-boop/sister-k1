import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nim: text("nim").notNull().unique(),
  nama: text("nama").notNull(),
  status: text("status").notNull(),
});

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
