import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const BASE_URL = SERVICE_URLS.schedule();

describe("Node 5: Schedule Server (JSON-RPC 2.0 Tests)", () => {
  it("getAllSchedules - Harus mengembalikan seluruh daftar jadwal", async () => {
    const list = await callJsonRpc(BASE_URL, "getAllSchedules", {});
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("getScheduleByCourseId - Harus mengembalikan jadwal berdasarkan course ID", async () => {
    const list = await callJsonRpc(BASE_URL, "getScheduleByCourseId", {
      courseId: 1,
    });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].courseId).toBe(1);
  });

  it("getScheduleByDay - Harus mengembalikan jadwal berdasarkan hari", async () => {
    const list = await callJsonRpc(BASE_URL, "getScheduleByDay", {
      day: "Senin",
    });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].day).toBe("Senin");
  });

  it("checkScheduleConflict - Harus mengembalikan hasil pengecekan konflik tanpa bentrok", async () => {
    const result = await callJsonRpc(BASE_URL, "checkScheduleConflict", {
      courseIds: [1, 2],
    });
    expect(result).toBeTruthy();
    expect(typeof result.hasConflict).toBe("boolean");
    expect(Array.isArray(result.conflicts)).toBe(true);
  });
});
