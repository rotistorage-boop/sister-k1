import { eq } from "drizzle-orm";
import { db } from "../db";
import { courses } from "../db/schema";

export async function getCourseByKodeService(kode: string) {
  return db.select().from(courses).where(eq(courses.kode, kode)).get();
}

export async function getCourseByIdService(id: number) {
  return db.select().from(courses).where(eq(courses.id, id)).get();
}

export async function getAllCourseService() {
  return db.select().from(courses).all();
}

export async function createCourseService(
  kode: string,
  nama: string,
  sks: number,
  kuota: number,
) {
  return db
    .insert(courses)
    .values({ kode, nama, sks, kuota })
    .returning()
    .get();
}

