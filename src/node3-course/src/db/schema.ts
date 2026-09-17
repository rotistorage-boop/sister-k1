import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("course", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kode: text("kode").notNull().unique(),
  nama: text("nama").notNull(),
  sks: integer("sks").notNull(),
  kuota: integer("kuota").notNull(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
