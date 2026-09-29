import {
  getStudentByNimService,
  getAllStudentsService,
  createStudentService,
} from "../services/student.service.js";
import {
  JsonRpcError,
  JSON_RPC_ERRORS,
} from "../../../utils/jsonrpc.util.js";

export async function createStudentHandler(params: {
  nim: string;
  nama: string;
  status?: string;
}) {
  const { nim, nama, status } = params || {};
  if (!nim || !nama) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "NIM and nama are required",
    );
  }

  const existing = await getStudentByNimService(nim);
  if (existing) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.BAD_REQUEST.code,
      `Mahasiswa dengan NIM ${nim} sudah ada`,
    );
  }

  return await createStudentService(nim, nama, status || "aktif");
}

export async function getStudentByNimHandler(params: { nim: string }) {
  const { nim } = params || {};
  if (!nim) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "NIM is required",
    );
  }

  const student = await getStudentByNimService(nim);
  if (!student) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mahasiswa dengan NIM ${nim} tidak ditemukan`,
    );
  }

  return student;
}

export async function getStudentStatusHandler(params: { nim: string }) {
  const { nim } = params || {};
  if (!nim) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "NIM is required",
    );
  }

  const student = await getStudentByNimService(nim);
  if (!student) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mahasiswa dengan NIM ${nim} tidak ditemukan`,
    );
  }

  return { nim: student.nim, status: student.status, nama: student.nama };
}

export async function getAllStudentsHandler(_params?: any) {
  return await getAllStudentsService();
}
