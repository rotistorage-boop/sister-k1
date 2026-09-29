import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import { callJsonRpc } from "../utils/jsonrpc.util.js";
import { SERVICE_URLS } from "../utils/service-url.util.js";

dotenv.config();

const rl = readline.createInterface({ input, output });

async function main() {
  while (true) {
    console.log("\n========================================================");
    console.log("   NODE 1: STUDENT CLIENT (JSON-RPC 2.0 PROTOCOL)      ");
    console.log("========================================================");
    console.log("--- NODE 2: STUDENT SERVER (RPC) ---");
    console.log("1. Lihat Semua Mahasiswa");
    console.log("2. Cari Mahasiswa by NIM");
    console.log("3. Cek Status Mahasiswa by NIM");
    console.log("4. Tambah Mahasiswa Baru");
    console.log("\n--- NODE 3: COURSE SERVER (RPC) ---");
    console.log("5. Lihat Semua Mata Kuliah");
    console.log("6. Cari Mata Kuliah by Kode/ID");
    console.log("7. Cek Kuota Mata Kuliah by ID");
    console.log("\n--- NODE 4: KRS SERVER (ORKESTRATOR RPC) ---");
    console.log("8. Submit KRS Mahasiswa (RPC Node 2, 3, dan 5)");
    console.log("9. Cari KRS Mahasiswa by NIM");
    console.log("10. Lihat Detail KRS by ID");
    console.log("11. Lihat Semua KRS");
    console.log("\n--- NODE 5: SCHEDULE SERVER (RPC) ---");
    console.log("12. Lihat Jadwal by Course ID");
    console.log("13. Lihat Jadwal by Hari");
    console.log("14. Lihat Semua Jadwal");
    console.log("15. Cek Konflik Jadwal");
    console.log("16. Keluar");

    const choice = await rl.question("\nPilih menu (1-16): ");
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
      const nim = await rl.question("Masukkan NIM Mahasiswa: ");
      const courseIdsInput = await rl.question(
        "Masukkan ID Mata Kuliah (pisahkan koma, contoh: 1,2): ",
      );
      const courseIds = courseIdsInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      await submitKrs(nim.trim(), courseIds);
    } else if (trimmedChoice === "9") {
      const nim = await rl.question("Masukkan NIM untuk cari KRS: ");
      await getKrsByNim(nim.trim());
    } else if (trimmedChoice === "10") {
      const id = await rl.question("Masukkan ID KRS: ");
      await getKrsById(id.trim());
    } else if (trimmedChoice === "11") {
      await getAllKrs();
    } else if (trimmedChoice === "12") {
      const courseId = await rl.question("Masukkan Course ID: ");
      await getScheduleByCourseId(courseId.trim());
    } else if (trimmedChoice === "13") {
      const day = await rl.question("Masukkan Hari (Senin/Selasa/Rabu/Kamis/Jumat): ");
      await getScheduleByDay(day.trim());
    } else if (trimmedChoice === "14") {
      await getAllSchedules();
    } else if (trimmedChoice === "15") {
      const courseIdsInput = await rl.question(
        "Masukkan ID Mata Kuliah (pisahkan koma, contoh: 1,2): ",
      );
      const courseIds = courseIdsInput
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n));
      await checkScheduleConflict(courseIds);
    } else if (trimmedChoice === "16") {
      console.log("Keluar dari client. Sampai jumpa!");
      rl.close();
      process.exit(0);
    } else {
      console.log("Pilihan tidak valid! Masukkan angka 1 sampai 16.");
    }
  }
}

// === FUNCTIONS NODE 2 ===
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

// === FUNCTIONS NODE 3 ===
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

// === FUNCTIONS NODE 4 ===
async function submitKrs(nim: string, courseIds: number[]) {
  try {
    const url = SERVICE_URLS.krs();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'submitKrs' params:`, { nim, courseIds });
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

// === FUNCTIONS NODE 5 ===
async function getScheduleByCourseId(courseId: string) {
  try {
    const url = SERVICE_URLS.schedule();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getScheduleByCourseId' params: { courseId: ${courseId} }`);
    const result = await callJsonRpc(url, "getScheduleByCourseId", { courseId: Number(courseId) });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getScheduleByDay(day: string) {
  try {
    const url = SERVICE_URLS.schedule();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getScheduleByDay' params: { day: "${day}" }`);
    const result = await callJsonRpc(url, "getScheduleByDay", { day });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function getAllSchedules() {
  try {
    const url = SERVICE_URLS.schedule();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'getAllSchedules'`);
    const result = await callJsonRpc(url, "getAllSchedules", {});
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

async function checkScheduleConflict(courseIds: number[]) {
  try {
    const url = SERVICE_URLS.schedule();
    console.log(`\n[JSON-RPC Call] -> POST ${url} method: 'checkScheduleConflict' params:`, { courseIds });
    const result = await callJsonRpc(url, "checkScheduleConflict", { courseIds });
    console.log("[JSON-RPC Result]:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("[JSON-RPC Error]:", err.message);
  }
}

main();
