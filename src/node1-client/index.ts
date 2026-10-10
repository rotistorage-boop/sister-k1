import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { createRmiProxy, RmiError } from "../utils/rmi.util.js";
import type { IScheduleRemoteService } from "../node5-schedule/src/interfaces/schedule-remote.interface.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const rl = readline.createInterface({ input, output });

// Dynamic RMI Client Stub Proxy untuk ScheduleService di Node 5
function getScheduleRmiStub() {
  return createRmiProxy<IScheduleRemoteService>(
    SERVICE_URLS.scheduleRmi(),
    "ScheduleService",
  );
}

async function main() {
  while (true) {
    console.log("\n========================================================");
    console.log("   NODE 1: STUDENT CLIENT (HYBRID RPC & RMI SYSTEM)     ");
    console.log("========================================================");
    console.log("--- NODE 2: STUDENT SERVER (JSON-RPC 2.0) ---");
    console.log("1. Lihat Semua Mahasiswa");
    console.log("2. Cari Mahasiswa by NIM");
    console.log("3. Cek Status Mahasiswa by NIM");
    console.log("4. Tambah Mahasiswa Baru");
    console.log("\n--- NODE 3: COURSE SERVER (JSON-RPC 2.0) ---");
    console.log("5. Lihat Semua Mata Kuliah");
    console.log("6. Cari Mata Kuliah by Kode/ID");
    console.log("7. Cek Kuota Mata Kuliah by ID");
    console.log("8. Tambah Mata Kuliah Baru");
    console.log("\n--- NODE 4: KRS SERVER (ORKESTRATOR RPC + RMI) ---");
    console.log("9. Submit KRS Mahasiswa (RPC Node 2, 3 + RMI Node 5)");
    console.log("10. Cari KRS Mahasiswa by NIM");
    console.log("11. Lihat Detail KRS by ID");
    console.log("12. Lihat Semua KRS");
    console.log("\n--- NODE 5: SCHEDULE SERVER (RMI - REMOTE OBJECT) ---");
    console.log("13. Lihat Jadwal by Course ID (via RMI Proxy)");
    console.log("14. Lihat Jadwal by Hari (via RMI Proxy)");
    console.log("15. Lihat Semua Jadwal (via RMI Proxy)");
    console.log("16. Cek Konflik Jadwal (via RMI Proxy)");
    console.log("\n--- SINKRONISASI: MUTEX & JAM (FITUR BARU) ---");
    console.log("17. Simulasi Rebutan Kuota (lock terpusat Node 3 + token Node 4)");
    console.log("18. Sinkronisasi Jam Cristian (Node 1 -> Node 4 getTime)");
    console.log("19. Lihat Periode KRS (deadline Node 4)");
    console.log("20. Keluar");

    const choice = await rl.question("\nPilih menu (1-20): ");
    const trimmedChoice = choice.trim();

    if (trimmedChoice === "1") {
      await getAllStudents();
    } else if (trimmedChoice === "2") {
      const nim = await rl.question("Masukkan NIM: ");
      await getStudentByNim(nim.trim());
    } else if (trimmedChoice === "3") {
      const nim = await rl.question("Masukkan NIM untuk cek status: ");
      await checkStudentStatus(nim.trim());
    } else if (trimmedChoice === "4") {
      const nim = await rl.question("Masukkan NIM Baru: ");
      const nama = await rl.question("Masukkan Nama Mahasiswa: ");
      const statusInput = await rl.question(
        "Masukkan Status (default: aktif): ",
      );
      const status = statusInput.trim() || "aktif";
      await createStudent(nim.trim(), nama.trim(), status);
    } else if (trimmedChoice === "5") {
      await getAllCourses();
    } else if (trimmedChoice === "6") {
      const query = await rl.question("Masukkan Kode atau ID Matkul: ");
      await getCourseByQuery(query.trim());
    } else if (trimmedChoice === "7") {
      const id = await rl.question("Masukkan ID Matkul: ");
      await checkCourseQuota(id.trim());
    } else if (trimmedChoice === "8") {
      const kode = await rl.question("Masukkan Kode Matkul (contoh: IF205): ");
      const nama = await rl.question("Masukkan Nama Mata Kuliah: ");
      const sks = await rl.question("Masukkan Bobot SKS (default: 3): ");
      const kuota = await rl.question("Masukkan Kapasitas Kuota (default: 30): ");
      await createCourse(
        kode.trim(),
        nama.trim(),
        Number(sks.trim()) || 3,
        Number(kuota.trim()) || 30,
      );
    } else if (trimmedChoice === "9") {
      const nim = await rl.question("Masukkan NIM Mahasiswa: ");
      const courseIdsInput = await rl.question(
        "Masukkan ID Mata Kuliah (pisahkan koma, contoh: 1,2): ",
      );
      const courseIds = courseIdsInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      await submitKrs(nim.trim(), courseIds);
    } else if (trimmedChoice === "10") {
      const nim = await rl.question("Masukkan NIM untuk cari KRS: ");
      await getKrsByNim(nim.trim());
    } else if (trimmedChoice === "11") {
      const id = await rl.question("Masukkan ID KRS: ");
      await getKrsById(id.trim());
    } else if (trimmedChoice === "12") {
      await getAllKrs();
    } else if (trimmedChoice === "13") {
      const courseId = await rl.question("Masukkan Course ID: ");
      await getScheduleByCourseId(courseId.trim());
    } else if (trimmedChoice === "14") {
      const day = await rl.question("Masukkan Hari (Senin/Selasa/Rabu/Kamis/Jumat): ");
      await getScheduleByDay(day.trim());
    } else if (trimmedChoice === "15") {
      await getAllSchedules();
    } else if (trimmedChoice === "16") {
      const courseIdsInput = await rl.question(
        "Masukkan ID Mata Kuliah (pisahkan koma, contoh: 1,2): ",
      );
      const courseIds = courseIdsInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      await checkScheduleConflict(courseIds);
    } else if (trimmedChoice === "17") {
      const id = await rl.question("Masukkan ID Matkul untuk simulasi (default: 1): ");
      const n = await rl.question("Jumlah request bersamaan (default: 5): ");
      await simulateQuotaRace(id.trim() || "1", Number(n.trim()) || 5);
    } else if (trimmedChoice === "18") {
      await cristianSyncCli(4);
    } else if (trimmedChoice === "19") {
      await getKrsPeriodCli();
    } else if (trimmedChoice === "20") {
      console.log("Keluar dari client. Sampai jumpa!");
      rl.close();
      process.exit(0);
    } else {
      console.log("Pilihan tidak valid! Masukkan angka 1 sampai 20.");
    }
  }
}

// === FUNCTIONS NODE 2 (RPC) ===
async function getAllStudents() {
  try {
    const url = SERVICE_URLS.student();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getAllStudents'`);
    const result = await callJsonRpc(url, "getAllStudents", {});
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getStudentByNim(nim: string) {
  try {
    const url = SERVICE_URLS.student();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getStudentByNim' params: { nim: "${nim}" }`);
    const result = await callJsonRpc(url, "getStudentByNim", { nim });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function checkStudentStatus(nim: string) {
  try {
    const url = SERVICE_URLS.student();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getStudentStatus' params: { nim: "${nim}" }`);
    const result = await callJsonRpc(url, "getStudentStatus", { nim });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function createStudent(nim: string, nama: string, status: string) {
  try {
    const url = SERVICE_URLS.student();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'createStudent' params:`, { nim, nama, status });
    const result = await callJsonRpc(url, "createStudent", { nim, nama, status });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

// === FUNCTIONS NODE 3 (RPC) ===
async function getAllCourses() {
  try {
    const url = SERVICE_URLS.course();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getAllCourses'`);
    const result = await callJsonRpc(url, "getAllCourses", {});
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getCourseByQuery(query: string) {
  try {
    const url = SERVICE_URLS.course();
    const isId = !isNaN(Number(query));
    const method = isId ? "getCourseById" : "getCourseByKode";
    const params = isId ? { id: Number(query) } : { kode: query };
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: '${method}' params:`, params);
    const result = await callJsonRpc(url, method, params);
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function checkCourseQuota(id: string) {
  try {
    const url = SERVICE_URLS.course();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'checkQuota' params: { id: ${id} }`);
    const result = await callJsonRpc(url, "checkQuota", { id: Number(id) });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function createCourse(kode: string, nama: string, sks: number, kuota: number) {
  try {
    const url = SERVICE_URLS.course();
    console.log(
      `\n[JSON-RPC Call] -> POST ${url} method: 'createCourse' params:`,
      { kode, nama, sks, kuota },
    );
    const result = await callJsonRpc(url, "createCourse", { kode, nama, sks, kuota });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

// === FUNCTIONS NODE 4 (ORKESTRATOR) ===
async function submitKrs(nim: string, courseIds: number[]) {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'submitKrs' params:`, { nim, courseIds });
    console.log("  ↳ Node 4 akan memvalidasi via RPC ke Node 2 & 3, serta RMI ke Node 5");
    const result = await callJsonRpc(url, "submitKrs", { nim, courseIds });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getKrsByNim(nim: string) {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getKrsByNim' params: { nim: "${nim}" }`);
    const result = await callJsonRpc(url, "getKrsByNim", { nim });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getKrsById(id: string) {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getKrsById' params: { id: ${id} }`);
    const result = await callJsonRpc(url, "getKrsById", { id: Number(id) });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getAllKrs() {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getAllKrs'`);
    const result = await callJsonRpc(url, "getAllKrs", {});
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

// === FUNCTIONS NODE 5 (RMI - REMOTE METHOD INVOCATION) ===
async function getScheduleByCourseId(courseId: string) {
  try {
    const stub = getScheduleRmiStub();
    console.log(`\n[RMI Proxy Invocation] -> ScheduleService.getScheduleByCourseId(${courseId})`);
    const result = await stub.getScheduleByCourseId(Number(courseId));
    console.log("[RMI Invocation Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[RMI Error]:", err.message);
  }
}

async function getScheduleByDay(day: string) {
  try {
    const stub = getScheduleRmiStub();
    console.log(`\n[RMI Proxy Invocation] -> ScheduleService.getScheduleByDay("${day}")`);
    const result = await stub.getScheduleByDay(day);
    console.log("[RMI Invocation Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[RMI Error]:", err.message);
  }
}

async function getAllSchedules() {
  try {
    const stub = getScheduleRmiStub();
    console.log(`\n[RMI Proxy Invocation] -> ScheduleService.getAllSchedules()`);
    const result = await stub.getAllSchedules();
    console.log("[RMI Invocation Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[RMI Error]:", err.message);
  }
}

async function checkScheduleConflict(courseIds: number[]) {
  try {
    const stub = getScheduleRmiStub();
    console.log(`\n[RMI Proxy Invocation] -> ScheduleService.checkScheduleConflict([${courseIds.join(", ")}])`);
    const result = await stub.checkScheduleConflict(courseIds);
    console.log("[RMI Invocation Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[RMI Error]:", err.message);
  }
}

// === FITUR SINKRONISASI: MUTEX + CRISTIAN ===

/** Simulasi rebutan kuota: N submitKrs concorrent untuk matkul yang sama. */
async function simulateQuotaRace(courseId: string, concurrent: number) {
  try {
    const courseUrl = SERVICE_URLS.course();
    const krsUrl = SERVICE_URLS.krs();
    console.log(`\n[SIMULASI] Set kuota matkul ${courseId} = 1, lalu ${concurrent}x submitKrs bersamaan...`);
    await callJsonRpc(courseUrl, "setQuota", { id: Number(courseId), kuota: 1 });
    const before = await callJsonRpc(courseUrl, "checkQuota", { id: Number(courseId) });
    console.log("[Sebelum] kuota:", JSON.stringify(before));

    const results = await Promise.allSettled(
      Array.from({ length: concurrent }, (_, i) =>
        callJsonRpc(krsUrl, "submitKrs", {
          nim: `RACE${Date.now().toString().slice(-6)}${i}`,
          courseIds: [Number(courseId)],
        }).catch(async (e: any) => {
          // NIM fiktif ditolak Node 2 -> pakai NIM seed agar lolos validasi mahasiswa
          if (String(e.message).includes("Node 2")) {
            return callJsonRpc(krsUrl, "submitKrs", { nim: "240411100000", courseIds: [Number(courseId)] });
          }
          throw e;
        }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.filter((r) => r.status === "rejected").length;
    console.log(`[Hasil] sukses: ${ok}, ditolak: ${fail} (harusnya sukses = 1, sisanya ditolak kuota habis)`);
    results.forEach((r, i) => {
      console.log(`  request #${i + 1}:`, r.status === "fulfilled" ? "SUKSES" : `GAGAL: ${(r.reason as Error).message}`);
    });
    const after = await callJsonRpc(courseUrl, "checkQuota", { id: Number(courseId) });
    console.log("[Sesudah] kuota:", JSON.stringify(after), after.kuota < 0 ? "OVERBOOKING!" : "(tidak bocor)");
  } catch (err: any) {
    console.error("[SIMULASI Error]:", err.message);
  }
}

/** Cristian's algorithm via CLI: T1/T4 + RTT + offset tanpa mengubah jam sistem. */
async function cristianSyncCli(samples: number) {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[CRISTIAN] Sinkronisasi jam ke Node 4 (${samples} sampel getTime)...`);
    const all: Array<{ t1: number; t4: number; rtt: number; serverTime: number; offset: number }> = [];
    for (let i = 0; i < samples; i++) {
      const t1 = Date.now();
      const res: any = await callJsonRpc(url, "getTime", {});
      const t4 = Date.now();
      const rtt = t4 - t1;
      all.push({ t1, t4, rtt, serverTime: res.serverTime, offset: res.serverTime + rtt / 2 - t4 });
      console.log(`  sampel #${i + 1}: T1=${t1} T_server=${res.serverTime} T4=${t4} RTT=${rtt}ms offset=${res.serverTime + rtt / 2 - t4}ms`);
    }
    const best = all.slice().sort((a, b) => a.rtt - b.rtt)[0];
    console.log(`[CRISTIAN] Dipilih RTT terkecil: ${best.rtt}ms, offset: ${best.offset}ms`);
    console.log(`[CRISTIAN] Jam lokal: ${new Date().toISOString()} | Estimasi jam server: ${new Date(Date.now() + best.offset).toISOString()}`);
  } catch (err: any) {
    console.error("[CRISTIAN Error]:", err.message);
  }
}

async function getKrsPeriodCli() {
  try {
    const url = SERVICE_URLS.krs();
    const period: any = await callJsonRpc(url, "getKrsPeriod", {});
    console.log("\n[PERIODE KRS]:", JSON.stringify(period, null, 2));
  } catch (err: any) {
    console.error("[PERIODE Error]:", err.message);
  }
}

main();
