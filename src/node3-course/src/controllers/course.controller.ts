import {
  getAllCourseService,
  getCourseByKodeService,
  getCourseByIdService,
} from "../services/course.service.js";
import { JsonRpcError, JSON_RPC_ERRORS } from "../../../utils/jsonrpc.util.js";

export async function getAllCoursesHandler(_params?: any) {
  return await getAllCourseService();
}

export async function getCourseByKodeHandler(params: { kode: string }) {
  const { kode } = params || {};
  if (!kode) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kode mata kuliah is required",
    );
  }

  const course = await getCourseByKodeService(kode);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan kode ${kode} tidak ditemukan`,
    );
  }

  return course;
}

export async function getCourseByIdHandler(params: { id: number | string }) {
  const id = Number(params?.id);
  if (isNaN(id)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Valid course ID is required",
    );
  }

  const course = await getCourseByIdService(id);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan ID ${id} tidak ditemukan`,
    );
  }

  return course;
}

export async function checkQuotaHandler(params: { id: number | string }) {
  const id = Number(params?.id);
  if (isNaN(id)) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Valid course ID is required",
    );
  }

  const course = await getCourseByIdService(id);
  if (!course) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.NOT_FOUND.code,
      `Mata kuliah dengan ID ${id} tidak ditemukan`,
    );
  }

  return {
    id: course.id,
    kode: course.kode,
    nama: course.nama,
    sks: course.sks,
    kuota: course.kuota,
    isAvailable: course.kuota > 0,
  };
}
