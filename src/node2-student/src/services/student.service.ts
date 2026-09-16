import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { students } from "../db/schema";

export const getStudentByNimService = async (nim: string) => {
  return db.select().from(students).where(eq(students.nim, nim)).get();
};

export const getAllStudentsService = async () => {
  return db.select().from(students).all();
};
