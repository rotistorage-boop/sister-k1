import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const BASE_URL = SERVICE_URLS.krs();
const COURSE_URL = SERVICE_URLS.course();

describe("Node 4: KRS Server (JSON-RPC 2.0 Orchestrator Tests)", () => {
  // ISOLASI: course KHUSUS agar submitKrs di sini tidak menggerus kuota
  // course seed (id 1,2) dan tidak berebut lock dengan file test lain.
  // Course baru tanpa jadwal => lolos checkScheduleConflict (no conflict).
  let COURSE_A = 1;
  let COURSE_B = 2;

  beforeAll(async () => {
    const stamp = Date.now().toString().slice(-6);
    const a: any = await callJsonRpc(COURSE_URL, "createCourse", {
      kode: `NK4A${stamp}`,
      nama: "Matkul Isolasi Node4 A",
      sks: 2,
      kuota: 20,
    });
    const b: any = await callJsonRpc(COURSE_URL, "createCourse", {
      kode: `NK4B${stamp}`,
      nama: "Matkul Isolasi Node4 B",
      sks: 2,
      kuota: 20,
    });
    COURSE_A = a.id;
    COURSE_B = b.id;
  });

  it("submitKrs - Harus berhasil submit KRS dengan RPC ke Node 2, 3, dan 5", async () => {
    const res = await callJsonRpc(BASE_URL, "submitKrs", {
      nim: "240411100000",
      courseIds: [COURSE_A, COURSE_B],
    });
    expect(res).toBeTruthy();
    expect(res.krs).toBeTruthy();
    expect(res.krs.nim).toBe("240411100000");
    expect(Array.isArray(res.courses)).toBe(true);
    expect(res.courses.length).toBe(2);
    expect(res.student.status).toBe("aktif");
    expect(res.scheduleCheck).toBeTruthy();
    expect(res.scheduleCheck.hasConflict).toBe(false);
  });

  it("getAllKrs - Harus mengembalikan seluruh data KRS yang telah diperkaya", async () => {
    const list = await callJsonRpc(BASE_URL, "getAllKrs", {});
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("getKrsByNim - Harus mengembalikan daftar KRS berdasarkan NIM beserta detail matkul", async () => {
    const list = await callJsonRpc(BASE_URL, "getKrsByNim", {
      nim: "240411100000",
    });
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(Array.isArray(list[0].courses)).toBe(true);
    }
  });

  it("getKrsById - Harus mengembalikan KRS spesifik berdasarkan ID beserta detail matkul", async () => {
    const krs = await callJsonRpc(BASE_URL, "getKrsById", { id: 1 });
    expect(krs).toBeTruthy();
    expect(krs.id).toBe(1);
    expect(Array.isArray(krs.courses)).toBe(true);
  });
});
