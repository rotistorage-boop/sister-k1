import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
import { createRmiProxy } from "../utils/rmi.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";
import type { IScheduleRemoteService } from "../node5-schedule/src/interfaces/schedule-remote.interface.js";

dotenv.config();

const RMI_URL = SERVICE_URLS.scheduleRmi();

describe("Node 5: Schedule Server (RMI - Remote Method Invocation Tests)", () => {
  // Buat RMI Stub Proxy untuk ScheduleService
  const scheduleStub = createRmiProxy<IScheduleRemoteService>(
    RMI_URL,
    "ScheduleService",
  );

  it("RMI - getAllSchedules: Harus mengembalikan seluruh daftar jadwal via remote method", async () => {
    const list = await scheduleStub.getAllSchedules();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it("RMI - getScheduleByCourseId: Harus mengembalikan jadwal berdasarkan course ID", async () => {
    const list = await scheduleStub.getScheduleByCourseId(1);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].courseId).toBe(1);
  });

  it("RMI - getScheduleByDay: Harus mengembalikan jadwal berdasarkan hari", async () => {
    const list = await scheduleStub.getScheduleByDay("Senin");
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].day).toBe("Senin");
  });

  it("RMI - checkScheduleConflict: Harus mengecek konflik jadwal antar matkul", async () => {
    const result = await scheduleStub.checkScheduleConflict([1, 2]);
    expect(result).toBeTruthy();
    expect(typeof result.hasConflict).toBe("boolean");
    expect(Array.isArray(result.conflicts)).toBe(true);
    expect(Array.isArray(result.schedules)).toBe(true);
  });
});
