import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const BASE_URL = SERVICE_URLS.krs();

describe("Node 4: KRS Server (JSON-RPC 2.0 Orchestrator Tests)", () => {
  it("submitKrs - Harus berhasil submit KRS dengan RPC ke Node 2, 3, dan 5", async () => {
    const res = await callJsonRpc(BASE_URL, "submitKrs", {
      nim: "240411100000",
      courseIds: [1, 2],
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
