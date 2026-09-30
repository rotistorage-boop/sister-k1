import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const BASE_URL = SERVICE_URLS.course();

describe("Node 3: Course Server (JSON-RPC 2.0 Tests)", () => {
  it("getAllCourses - Harus mengembalikan semua daftar mata kuliah", async () => {
    const courses = await callJsonRpc(BASE_URL, "getAllCourses", {});
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThan(0);
  });

  it("getCourseByKode - Harus mengembalikan mata kuliah berdasarkan kode", async () => {
    const course = await callJsonRpc(BASE_URL, "getCourseByKode", { kode: "IF101" });
    expect(course).toBeTruthy();
    expect(course.kode).toBe("IF101");
  });

  it("getCourseById - Harus mengembalikan mata kuliah berdasarkan ID", async () => {
    const course = await callJsonRpc(BASE_URL, "getCourseById", { id: 1 });
    expect(course).toBeTruthy();
    expect(course.id).toBe(1);
  });

  it("checkQuota - Harus mengembalikan kuota dan ketersediaan mata kuliah", async () => {
    const quotaData = await callJsonRpc(BASE_URL, "checkQuota", { id: 1 });
    expect(quotaData).toBeTruthy();
    expect(quotaData.id).toBe(1);
    expect(typeof quotaData.kuota).toBe("number");
    expect(typeof quotaData.isAvailable).toBe("boolean");
  });

  it("createCourse - Harus berhasil menambahkan mata kuliah baru", async () => {
    const testKode = `TEST${Date.now().toString().slice(-4)}`;
    const newCourse = await callJsonRpc(BASE_URL, "createCourse", {
      kode: testKode,
      nama: "Testing Matkul Otomatis",
      sks: 3,
      kuota: 40,
    });
    expect(newCourse).toBeTruthy();
    expect(newCourse.kode).toBe(testKode);
    expect(newCourse.sks).toBe(3);
    expect(newCourse.kuota).toBe(40);
  });
});

