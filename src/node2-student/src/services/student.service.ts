import { eq } from "drizzle-orm";
import { db } from "../db";
import { students } from "../db/schema";

export async function getStudentByNimService(nim: string) {
  return db.select().from(students).where(eq(students.nim, nim)).get();
}

export async function getAllStudentsService() {
  return db.select().from(students).all();
}

export async function createStudentService(nim: string, nama: string, status: string = "aktif") {
  return db
    .insert(students)
    .values({ nim, nama, status })
    .returning()
    .get();
}
