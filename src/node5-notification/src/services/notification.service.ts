import { eq } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "../db/schema";

export async function createNotificationService(nim: string, message: string) {
  return db
    .insert(notifications)
    .values({
      nim,
      message,
      status: "sent",
    })
    .returning()
    .get();
}

export async function getNotificationsByNimService(nim: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.nim, nim))
    .all();
}

export async function getAllNotificationsService() {
  return db.select().from(notifications).all();
}
