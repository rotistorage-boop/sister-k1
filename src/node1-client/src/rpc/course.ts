import { callRpc } from "./client";

export interface Course {
  id: number;
  kode: string;
  nama: string;
  sks: number;
  kuota: number;
}

export interface CourseQuotaResult {
  id: number;
  nama: string;
  kuota: number;
}

const COURSE_RPC_URL = import.meta.env.VITE_COURSE_SERVICE_URL || "/rpc/course";

export async function getAllCourses(): Promise<Course[]> {
  return callRpc<Course[]>(COURSE_RPC_URL, "getAllCourses");
}

export async function getCourseById(id: number): Promise<Course> {
  return callRpc<Course>(COURSE_RPC_URL, "getCourseById", { id });
}

export async function getCourseByKode(kode: string): Promise<Course> {
  return callRpc<Course>(COURSE_RPC_URL, "getCourseByKode", { kode });
}

export async function checkCourseQuota(id: number): Promise<CourseQuotaResult> {
  return callRpc<CourseQuotaResult>(COURSE_RPC_URL, "checkQuota", { id });
}

export async function createCourse(
  kode: string,
  nama: string,
  sks: number,
  kuota: number,
): Promise<Course> {
  return callRpc<Course>(COURSE_RPC_URL, "createCourse", {
    kode,
    nama,
    sks,
    kuota,
  });
}

