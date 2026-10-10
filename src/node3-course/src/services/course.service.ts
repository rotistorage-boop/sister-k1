import { eq, sql } from "drizzle-orm";
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

/**
 * ATOMIC check-and-decrement kuota memakai satu statement SQL bersyarat.
 * Aman dari race condition antar proses karena SQLite mengeksekusi
 * UPDATE ... WHERE kuota >= amount secara atomik di dalam write lock DB.
 * Return null jika kuota tidak cukup / course tidak ada.
 */
export async function decrementQuotaAtomicService(id: number, amount = 1) {
  const updated = db
    .update(courses)
    .set({ kuota: sql`${courses.kuota} - ${amount}` })
    .where(sql`${courses.id} = ${id} AND ${courses.kuota} >= ${amount}`)
    .returning()
    .get();
  return updated ?? null;
}

export async function setQuotaService(id: number, kuota: number) {
  return db
    .update(courses)
    .set({ kuota })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

