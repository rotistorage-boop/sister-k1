import { eq } from "drizzle-orm";
import { db } from "../db";
import { krs, krsDetails } from "../db/schema";

export async function getKrsByIdService(id: number) {
  return db.select().from(krs).where(eq(krs.id, id)).get();
}

export async function getKrsByNimService(nim: string) {
  return db.select().from(krs).where(eq(krs.nim, nim)).all();
}

export async function getAllKrsService() {
  return db.select().from(krs).all();
}

export async function getKrsDetailByIdService(krsId: number) {
  return db
    .select({
      id: krsDetails.id,
      krsId: krsDetails.krsId,
      courseId: krsDetails.courseId,
    })
    .from(krsDetails)
    .where(eq(krsDetails.krsId, krsId))
    .all();
}

export async function createKrsService(nim: string, courseIds: number[]) {
  const newKrs = db
    .insert(krs)
    .values({
      nim,
    })
    .returning()
    .get();

  if (courseIds && courseIds.length > 0) {
    const details = courseIds.map((courseId) => ({
      krsId: newKrs.id,
      courseId,
    }));
    db.insert(krsDetails).values(details).run();
  }

  return newKrs;
}
