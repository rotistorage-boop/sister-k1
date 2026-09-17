import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nim: text("nim").notNull(),
  message: text("message").notNull(),
  status: text("status").default("sent").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
