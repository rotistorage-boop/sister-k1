import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const BASE_URL = SERVICE_URLS.student();

describe("Node 2: Student Server (JSON-RPC 2.0 Tests)", () => {
  it("getAllStudents - Harus mengembalikan semua data mahasiswa", async () => {
    const students = await callJsonRpc(BASE_URL, "getAllStudents", {});
    expect(Array.isArray(students)).toBe(true);
    expect(students.length).toBeGreaterThan(0);
  });

  it("createStudent - Harus berhasil menambahkan mahasiswa baru", async () => {
    const testNim = `TEST_${Date.now()}`;
    const newStudent = await callJsonRpc(BASE_URL, "createStudent", {
      nim: testNim,
      nama: "Mahasiswa JSON-RPC",
      status: "aktif",
    });
    expect(newStudent.nim).toBe(testNim);
    expect(newStudent.status).toBe("aktif");
  });

  it("getStudentByNim - Harus mengembalikan mahasiswa berdasarkan NIM", async () => {
    const student = await callJsonRpc(BASE_URL, "getStudentByNim", {
      nim: "240411100000",
    });
    expect(student).toBeTruthy();
    expect(student.nim).toBe("240411100000");
  });

  it("getStudentStatus - Harus mengembalikan status mahasiswa", async () => {
    const statusData = await callJsonRpc(BASE_URL, "getStudentStatus", {
      nim: "240411100000",
    });
    expect(statusData).toBeTruthy();
    expect(statusData.nim).toBe("240411100000");
    expect(statusData.status).toBe("aktif");
  });
});
