import { callRpc } from "./client";

export interface Student {
  id: number;
  nim: string;
  nama: string;
  status: "aktif" | "cuti" | "lulus" | "drop_out" | string;
}

export interface StudentStatusResult {
  nim: string;
  nama: string;
  status: string;
}

const STUDENT_RPC_URL =
  import.meta.env.VITE_STUDENT_SERVICE_URL || "/rpc/student";

export async function getAllStudents(): Promise<Student[]> {
  return callRpc<Student[]>(STUDENT_RPC_URL, "getAllStudents");
}

export async function getStudentByNim(nim: string): Promise<Student> {
  return callRpc<Student>(STUDENT_RPC_URL, "getStudentByNim", { nim });
}

export async function getStudentStatus(
  nim: string,
): Promise<StudentStatusResult> {
  return callRpc<StudentStatusResult>(STUDENT_RPC_URL, "getStudentStatus", {
    nim,
  });
}

export async function createStudent(
  nim: string,
  nama: string,
  status: string = "aktif",
): Promise<Student> {
  return callRpc<Student>(STUDENT_RPC_URL, "createStudent", {
    nim,
    nama,
    status,
  });
}
