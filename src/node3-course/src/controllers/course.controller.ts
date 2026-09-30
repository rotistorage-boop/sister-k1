import {
  getAllCourseService,
  getCourseByKodeService,
  getCourseByIdService,
  createCourseService,
} from "../services/course.service.js";
import { JsonRpcError, JSON_RPC_ERRORS } from "../../../utils/jsonrpc.util.js";

export async function createCourseHandler(params: {
  kode: string;
  nama: string;
  sks: number | string;
  kuota: number | string;
}) {
  const { kode, nama } = params || {};
  const sks = Number(params?.sks);
  const kuota = Number(params?.kuota);

  if (!kode || typeof kode !== "string" || !kode.trim()) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kode mata kuliah is required and must be a non-empty string",
    );
  }

  if (!nama || typeof nama !== "string" || !nama.trim()) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Nama mata kuliah is required and must be a non-empty string",
    );
  }

  if (isNaN(sks) || sks <= 0) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "SKS must be a valid positive integer",
    );
  }

  if (isNaN(kuota) || kuota < 0) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS.code,
      "Kuota must be a valid non-negative integer",
    );
  }

  const cleanKode = kode.trim().toUpperCase();
  const cleanNama = nama.trim();

  const existing = await getCourseByKodeService(cleanKode);
  if (existing) {
    throw new JsonRpcError(
      JSON_RPC_ERRORS.BAD_REQUEST.code,
      `Mata kuliah dengan kode ${cleanKode} sudah ada`,
    );
  }

  return await createCourseService(cleanKode, cleanNama, Math.floor(sks), Math.floor(kuota));
}


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
